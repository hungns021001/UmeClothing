namespace BE_UmeClothing.Models;

public class BookingItem
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;

    /// <summary>Trỏ tới size cụ thể (không phải Product): đây là đơn vị thực sự được giữ lịch.</summary>
    public int ProductVariantId { get; set; }
    public ProductVariant ProductVariant { get; set; } = null!;

    /// <summary>Snapshot size tại thời điểm đặt, để lịch sử đơn không đổi dù sau này admin sửa tên size.</summary>
    public string Size { get; set; } = string.Empty;

    /// <summary>Snapshot giá thuê/ngày tại thời điểm đặt.</summary>
    public decimal RentalPrice { get; set; }

    /// <summary>Snapshot tiền cọc tại thời điểm đặt.</summary>
    public decimal DepositPrice { get; set; }

    /// <summary>Luôn = 1 (mỗi ProductVariant là một đơn vị duy nhất).</summary>
    public int Quantity { get; set; } = 1;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Note { get; set; }
}
