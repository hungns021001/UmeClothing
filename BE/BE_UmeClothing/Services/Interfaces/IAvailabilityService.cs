using BE_UmeClothing.DTOs.Common;
using BE_UmeClothing.DTOs.Products;

namespace BE_UmeClothing.Services.Interfaces;

/// <summary>
/// Đơn vị availability luôn là ProductVariant (một size cụ thể), KHÔNG phải Product — hai size khác nhau
/// của cùng một sản phẩm có lịch hoàn toàn độc lập với nhau.
/// </summary>
public interface IAvailabilityService
{
    /// <summary>Kiểm tra một variant (size) có trống trong [startDate, endDate) hay không (đã tính buffer).</summary>
    Task<AvailabilityCheckResult> CheckAvailabilityAsync(
        int variantId, DateOnly startDate, DateOnly endDate,
        int? excludeBookingId = null, CancellationToken ct = default);

    /// <summary>Id các Product có ÍT NHẤT MỘT variant (Status = Available, Product.Status = Available)
    /// còn trống trong khoảng ngày. Dùng cho trang danh sách/tìm kiếm sản phẩm.</summary>
    Task<List<int>> GetAvailableProductIdsAsync(DateOnly startDate, DateOnly endDate, CancellationToken ct = default);

    /// <summary>Id các variant đang bị chặn lịch trong khoảng ngày (trong tập variantIds nếu có truyền).</summary>
    Task<List<int>> GetBlockedVariantIdsAsync(
        DateOnly startDate, DateOnly endDate, IReadOnlyCollection<int>? variantIds = null,
        int? excludeBookingId = null, CancellationToken ct = default);

    /// <summary>Các khoảng ngày đang bị chặn của một variant từ ngày <paramref name="from"/> (End là exclusive, đã gồm buffer).</summary>
    Task<List<DateRangeDto>> GetBlockedRangesAsync(int variantId, DateOnly from, CancellationToken ct = default);
}
