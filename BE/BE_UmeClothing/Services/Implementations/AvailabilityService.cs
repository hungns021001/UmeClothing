using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.DTOs.Products;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Models;
using BE_UmeClothing.Models.Enums;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BE_UmeClothing.Services.Implementations;

/// <summary>
/// Quy tắc giữ lịch (theo từng ProductVariant — mỗi size là một đơn vị độc lập):
///  - Confirmed, Renting luôn giữ lịch.
///  - Pending chỉ giữ lịch trong PendingHoldHours kể từ CreatedAt.
///  - Returned, Completed, Cancelled không giữ lịch.
///  - Renting quá hạn trả vẫn chặn lịch (sản phẩm chưa về).
///  - Mỗi booking được mở rộng BufferDays ở hai đầu: [Start - buffer, End + buffer).
/// Đặt thuê được khi Product.Status VÀ ProductVariant.Status đều là Available.
/// </summary>
public class AvailabilityService : IAvailabilityService
{
    private readonly AppDbContext _db;
    private readonly BookingOptions _opt;

    public AvailabilityService(AppDbContext db, IOptions<BookingOptions> options)
    {
        _db = db;
        _opt = options.Value;
    }

    public async Task<AvailabilityCheckResult> CheckAvailabilityAsync(
        int variantId, DateOnly startDate, DateOnly endDate, int? excludeBookingId = null, CancellationToken ct = default)
    {
        if (endDate <= startDate)
            throw new BadRequestException("Ngày trả phải sau ngày bắt đầu.");

        var variant = await _db.ProductVariants.AsNoTracking()
            .Where(v => v.Id == variantId)
            .Select(v => new { v.Status, ProductStatus = v.Product.Status })
            .FirstOrDefaultAsync(ct);

        if (variant is null || variant.ProductStatus == ProductStatus.Hidden)
            throw new NotFoundException("Không tìm thấy size này của sản phẩm.");

        if (variant.ProductStatus != ProductStatus.Available)
            return new AvailabilityCheckResult(false, new List<DateRangeDto>(), "Sản phẩm đang tạm ngưng cho thuê.");

        if (variant.Status != ProductStatus.Available)
            return new AvailabilityCheckResult(false, new List<DateRangeDto>(), "Size này hiện không nhận đặt thuê (đang bảo trì/giặt ủi).");

        var conflicts = await Overlapping(ActiveItems(excludeBookingId).Where(i => i.ProductVariantId == variantId), startDate, endDate)
            .OrderBy(i => i.StartDate)
            .Select(i => new { i.StartDate, i.EndDate, i.Booking.Status })
            .ToListAsync(ct);

        var ranges = conflicts.Select(c => ToBlockedRange(c.StartDate, c.EndDate, c.Status)).ToList();
        return new AvailabilityCheckResult(ranges.Count == 0, ranges, ranges.Count == 0 ? null : "Size này đã có lịch thuê trong khoảng thời gian này.");
    }

    public async Task<List<int>> GetBlockedVariantIdsAsync(
        DateOnly startDate, DateOnly endDate, IReadOnlyCollection<int>? variantIds = null,
        int? excludeBookingId = null, CancellationToken ct = default)
    {
        var query = ActiveItems(excludeBookingId);

        if (variantIds is { Count: > 0 })
        {
            var ids = variantIds.ToList();
            query = query.Where(i => ids.Contains(i.ProductVariantId));
        }

        return await Overlapping(query, startDate, endDate)
            .Select(i => i.ProductVariantId)
            .Distinct()
            .ToListAsync(ct);
    }

    public async Task<List<int>> GetAvailableProductIdsAsync(DateOnly startDate, DateOnly endDate, CancellationToken ct = default)
    {
        if (endDate <= startDate)
            throw new BadRequestException("Ngày trả phải sau ngày bắt đầu.");

        var blockedVariantIds = await GetBlockedVariantIdsAsync(startDate, endDate, null, null, ct);

        return await _db.Products.AsNoTracking()
            .Where(p => p.Status == ProductStatus.Available &&
                        p.Variants.Any(v => v.Status == ProductStatus.Available && !blockedVariantIds.Contains(v.Id)))
            .Select(p => p.Id)
            .ToListAsync(ct);
    }

    public async Task<List<DateRangeDto>> GetBlockedRangesAsync(int variantId, DateOnly from, CancellationToken ct = default)
    {
        var floor = from.AddDays(-_opt.BufferDays);

        var items = await ActiveItems(null)
            .Where(i => i.ProductVariantId == variantId && (i.EndDate > floor || i.Booking.Status == BookingStatus.Renting))
            .OrderBy(i => i.StartDate)
            .Select(i => new { i.StartDate, i.EndDate, i.Booking.Status })
            .ToListAsync(ct);

        return items.Select(i => ToBlockedRange(i.StartDate, i.EndDate, i.Status)).ToList();
    }

    private IQueryable<BookingItem> ActiveItems(int? excludeBookingId)
    {
        var pendingCutoff = DateTime.UtcNow.AddHours(-_opt.PendingHoldHours);

        var query = _db.BookingItems.AsNoTracking().Where(i =>
            i.Booking.Status == BookingStatus.Confirmed ||
            i.Booking.Status == BookingStatus.Renting ||
            (i.Booking.Status == BookingStatus.Pending && i.Booking.CreatedAt > pendingCutoff));

        if (excludeBookingId.HasValue)
        {
            var excluded = excludeBookingId.Value;
            query = query.Where(i => i.BookingId != excluded);
        }

        return query;
    }

    private IQueryable<BookingItem> Overlapping(IQueryable<BookingItem> query, DateOnly start, DateOnly end)
    {
        var endPlusBuffer = end.AddDays(_opt.BufferDays);
        var startMinusBuffer = start.AddDays(-_opt.BufferDays);
        var today = _opt.Today();

        return query.Where(i =>
            (i.StartDate < endPlusBuffer && i.EndDate > startMinusBuffer) ||
            // Đang thuê nhưng quá hạn trả: sản phẩm chưa về nên chặn mọi yêu cầu mới.
            (i.Booking.Status == BookingStatus.Renting && i.EndDate < today && i.StartDate < endPlusBuffer));
    }

    private DateRangeDto ToBlockedRange(DateOnly start, DateOnly end, BookingStatus status)
    {
        var today = _opt.Today();
        var blockedEnd = status == BookingStatus.Renting && end < today
            ? today.AddYears(1)
            : end.AddDays(_opt.BufferDays);

        return new DateRangeDto(start.AddDays(-_opt.BufferDays), blockedEnd);
    }
}
