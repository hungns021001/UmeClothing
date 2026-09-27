using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.Models;

/// <summary>
/// Một size cụ thể của một Product = một món đồ vật lý riêng biệt, có lịch thuê riêng (qua BookingItem).
/// Size M đang được thuê KHÔNG ảnh hưởng đến việc Size L còn trống hay không.
/// </summary>
public class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string Size { get; set; } = string.Empty;

    /// <summary>Trạng thái riêng của size này (ví dụ: size này đang bảo trì/giặt ủi dài hạn dù sản phẩm vẫn Available).
    /// Đặt thuê được khi CẢ Product.Status VÀ ProductVariant.Status đều là Available.</summary>
    public ProductStatus Status { get; set; } = ProductStatus.Available;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BookingItem> BookingItems { get; set; } = new List<BookingItem>();
}
