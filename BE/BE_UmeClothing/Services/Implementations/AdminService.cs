using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Admin;
using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Models.Enums;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BE_UmeClothing.Services.Implementations;

public class AdminService : IAdminService
{
    private readonly AppDbContext _db;
    private readonly IRefreshTokenService _refreshTokens;

    public AdminService(AppDbContext db, IRefreshTokenService refreshTokens)
    {
        _db = db;
        _refreshTokens = refreshTokens;
    }

    /// <summary>Doanh thu = Subtotal + LateFee (tiền thuê + phụ thu trả muộn, không gồm tiền cọc hoàn lại) của các booking Completed.</summary>
    public async Task<DashboardStatsDto> GetDashboardStatsAsync(CancellationToken ct = default)
    {
        var totalProducts = await _db.Products.CountAsync(ct);
        var totalCustomers = await _db.Users.CountAsync(u => u.Role == UserRole.Customer, ct);

        var byStatus = await _db.Bookings.AsNoTracking()
            .GroupBy(b => b.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        int Count(BookingStatus s) => byStatus.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

        var revenue = await _db.Bookings.AsNoTracking()
            .Where(b => b.Status == BookingStatus.Completed)
            .SumAsync(b => (decimal?)(b.Subtotal + b.LateFee), ct) ?? 0m;

        return new DashboardStatsDto(
            totalProducts, totalCustomers, byStatus.Sum(x => x.Count),
            Count(BookingStatus.Pending), Count(BookingStatus.Confirmed), Count(BookingStatus.Renting),
            Count(BookingStatus.Returned), Count(BookingStatus.Completed), Count(BookingStatus.Cancelled),
            revenue);
    }

    public async Task<PagedResult<CustomerListItemDto>> GetCustomersAsync(CustomerQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        var q = _db.Users.AsNoTracking().Where(u => u.Role == UserRole.Customer);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(u => u.FullName.Contains(s) || u.Email.Contains(s) || (u.Phone != null && u.Phone.Contains(s)));
        }

        var total = await q.CountAsync(ct);

        var items = await q.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new CustomerListItemDto(u.Id, u.FullName, u.Email, u.Phone, u.IsActive, u.CreatedAt, u.Bookings.Count))
            .ToListAsync(ct);

        return new PagedResult<CustomerListItemDto>(items, page, pageSize, total);
    }

    public async Task<CustomerListItemDto> SetCustomerActiveAsync(int customerId, bool isActive, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == customerId && u.Role == UserRole.Customer, ct)
                   ?? throw new NotFoundException("Không tìm thấy khách hàng.");

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        if (!isActive)
        {
            await _refreshTokens.RevokeAllForUserAsync(customerId, ct);
        }

        var bookingCount = await _db.Bookings.CountAsync(b => b.CustomerId == customerId, ct);
        return new CustomerListItemDto(user.Id, user.FullName, user.Email, user.Phone, user.IsActive, user.CreatedAt, bookingCount);
    }

    public async Task<List<CalendarItemDto>> GetCalendarAsync(DateOnly from, DateOnly to, int? productId, CancellationToken ct = default)
    {
        if (to <= from)
            throw new BadRequestException("Khoảng ngày không hợp lệ.");
        if (to.DayNumber - from.DayNumber > 366)
            throw new BadRequestException("Chỉ được xem tối đa 366 ngày mỗi lần.");

        var q = _db.BookingItems.AsNoTracking()
            .Where(i => i.Booking.Status != BookingStatus.Cancelled && i.StartDate < to && i.EndDate > from);

        if (productId.HasValue)
            q = q.Where(i => i.ProductVariant.ProductId == productId.Value);

        return await q.OrderBy(i => i.StartDate)
            .Take(2000)
            .Select(i => new CalendarItemDto(
                i.BookingId, i.Booking.BookingCode, i.ProductVariantId, i.ProductVariant.ProductId,
                i.ProductVariant.Product.Name, i.Size,
                i.StartDate, i.EndDate, i.Booking.Status,
                i.Booking.Customer != null ? i.Booking.Customer.FullName : (i.Booking.GuestName ?? "")))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Gộp theo "thời điểm hoàn tất" = UpdatedAt của booking tại lúc Status trở thành Completed. Gộp trong bộ
    /// nhớ (C#) thay vì SQL GROUP BY theo tuần/tháng để tránh dịch LINQ phức tạp sang T-SQL và để cùng logic
    /// chạy được trên cả SQL Server lẫn SQLite (test).
    /// </summary>
    public async Task<RevenueReportDto> GetRevenueReportAsync(DateOnly from, DateOnly to, string groupBy, CancellationToken ct = default)
    {
        if (to <= from)
            throw new BadRequestException("Khoảng ngày không hợp lệ.");
        if (to.DayNumber - from.DayNumber > 366 * 2)
            throw new BadRequestException("Chỉ được xem tối đa 2 năm mỗi lần.");

        var normalizedGroupBy = groupBy.Trim().ToLowerInvariant();
        if (normalizedGroupBy is not ("day" or "week" or "month"))
            throw new BadRequestException("groupBy phải là day, week hoặc month.");

        var fromUtc = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toUtc = to.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var completed = await _db.Bookings.AsNoTracking()
            .Where(b => b.Status == BookingStatus.Completed && b.UpdatedAt >= fromUtc && b.UpdatedAt < toUtc)
            .Select(b => new { b.UpdatedAt, b.Subtotal, b.LateFee })
            .ToListAsync(ct);

        DateOnly BucketStart(DateOnly day) => normalizedGroupBy switch
        {
            "week" => day.AddDays(-(((int)day.DayOfWeek + 6) % 7)),
            "month" => new DateOnly(day.Year, day.Month, 1),
            _ => day
        };

        var periods = completed
            .Select(b => new { Day = DateOnly.FromDateTime(b.UpdatedAt), b.Subtotal, b.LateFee })
            .GroupBy(x => BucketStart(x.Day))
            .Select(g => new RevenuePeriodDto(
                g.Key,
                g.Sum(x => x.Subtotal),
                g.Sum(x => x.LateFee),
                g.Sum(x => x.Subtotal + x.LateFee),
                g.Count()))
            .OrderBy(p => p.PeriodStart)
            .ToList();

        return new RevenueReportDto(normalizedGroupBy, from, to, periods.Sum(p => p.TotalRevenue), periods);
    }
}
