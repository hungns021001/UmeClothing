using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.Models;

public class Booking
{
    public int Id { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public User Customer { get; set; } = null!;

    /// <summary>Ngày bắt đầu thuê (inclusive).</summary>
    public DateOnly StartDate { get; set; }

    /// <summary>Ngày trả (exclusive). Số ngày thuê = EndDate - StartDate.</summary>
    public DateOnly EndDate { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public decimal Subtotal { get; set; }
    public decimal Deposit { get; set; }
    public decimal Total { get; set; }
    public string? CustomerNote { get; set; }
    public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Optimistic concurrency cho các thao tác đổi trạng thái đồng thời.</summary>
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<BookingItem> Items { get; set; } = new List<BookingItem>();
}
