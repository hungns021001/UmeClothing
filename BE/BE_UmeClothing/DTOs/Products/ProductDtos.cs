using System.ComponentModel.DataAnnotations;
using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.DTOs.Products;

/// <summary>Thuộc tính chung cho mọi size. Không có Size ở đây — size được quản lý qua ProductVariant riêng.</summary>
public class ProductRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Danh mục không hợp lệ.")]
    public int CategoryId { get; set; }

    [Required(ErrorMessage = "Tên sản phẩm là bắt buộc.")]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Slug { get; set; }

    [StringLength(4000)]
    public string? Description { get; set; }

    [Range(typeof(decimal), "0.01", "100000000", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true, ErrorMessage = "Giá thuê phải lớn hơn 0.")]
    public decimal RentalPrice { get; set; }

    [Range(typeof(decimal), "0", "100000000", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true, ErrorMessage = "Tiền cọc không hợp lệ.")]
    public decimal DepositPrice { get; set; }

    [Required(ErrorMessage = "Màu sắc là bắt buộc.")]
    [StringLength(50)]
    public string Color { get; set; } = string.Empty;

    public ProductStatus Status { get; set; } = ProductStatus.Available;
}

public class ProductVariantRequest
{
    [Required(ErrorMessage = "Size là bắt buộc.")]
    [StringLength(30)]
    public string Size { get; set; } = string.Empty;

    public ProductStatus Status { get; set; } = ProductStatus.Available;
}

public record ProductVariantDto(int Id, int ProductId, string Size, ProductStatus Status, DateTime CreatedAt, DateTime UpdatedAt);

/// <summary>Tất cả thuộc tính đều nullable/có default để [FromQuery] không bị coi là bắt buộc.</summary>
public class ProductQuery
{
    public string? Search { get; set; }
    public int? CategoryId { get; set; }
    public string? CategorySlug { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }

    /// <summary>Chỉ trả sản phẩm có ÍT NHẤT MỘT size khớp giá trị này (không quan tâm size đó còn trống hay không).</summary>
    public string? Size { get; set; }
    public string? Color { get; set; }
    public ProductStatus? Status { get; set; }

    /// <summary>Nếu có cả hai, chỉ trả sản phẩm có ÍT NHẤT MỘT size còn trống trong khoảng ngày này.
    /// Muốn biết CHÍNH XÁC size nào còn trống, gọi availability theo từng variant sau khi khách chọn size.</summary>
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    /// <summary>newest (mặc định) | price_asc | price_desc | name</summary>
    public string? Sort { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public record ProductImageDto(int Id, string Url, int SortOrder, bool IsPrimary);

public record ProductDto(
    int Id, int CategoryId, string CategoryName, string CategorySlug,
    string Name, string Slug, string? Description,
    decimal RentalPrice, decimal DepositPrice, string Color,
    ProductStatus Status, DateTime CreatedAt, DateTime UpdatedAt,
    List<ProductImageDto> Images, List<ProductVariantDto> Variants);

public class ReorderImagesRequest
{
    [Required]
    [MinLength(1)]
    public List<int> ImageIds { get; set; } = new();
}

public record AvailabilityCheckResult(bool IsAvailable, List<BE_UmeClothing.DTOs.Common.DateRangeDto> Conflicts, string? Reason);

/// <summary>Chỉ chứa khoảng ngày bị chặn, không lộ thông tin khách hàng. Luôn theo một VARIANT cụ thể (một size),
/// không phải theo Product — hai size khác nhau của cùng sản phẩm có lịch hoàn toàn độc lập.</summary>
public record VariantAvailabilityDto(
    int ProductId,
    int VariantId,
    string Size,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool? IsAvailable,
    string? Reason,
    List<BE_UmeClothing.DTOs.Common.DateRangeDto> Conflicts,
    List<BE_UmeClothing.DTOs.Common.DateRangeDto> BlockedRanges);
