using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.Models;

/// <summary>
/// "Sản phẩm" ở mức mẫu mã: tên, mô tả, giá, ảnh, màu là chung cho mọi size. Từng size là một
/// ProductVariant — một món đồ vật lý riêng với lịch thuê riêng (xem ProductVariant).
/// </summary>
public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Giá thuê / ngày. Dùng chung cho mọi size của sản phẩm.</summary>
    public decimal RentalPrice { get; set; }
    public decimal DepositPrice { get; set; }
    public string Color { get; set; } = string.Empty;

    /// <summary>Trạng thái tổng thể của sản phẩm trong catalog (KHÁC với ProductVariant.Status của từng size).
    /// Hidden ở đây = ẩn toàn bộ sản phẩm bất kể từng size đang thế nào.</summary>
    public ProductStatus Status { get; set; } = ProductStatus.Available;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}
