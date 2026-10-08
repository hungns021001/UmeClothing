using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.Models;

public class Booking
{
    public int Id { get; set; }
    public string BookingCode { get; set; } = string.Empty;

    /// <summary>Null nếu đây là đơn đặt khách vãng lai (guest) — khi đó GuestName/GuestPhone bắt buộc có giá trị.
    /// Đúng một trong hai: (CustomerId có giá trị) HOẶC (GuestName + GuestPhone có giá trị). Ràng buộc này
    /// được kiểm tra ở BookingService, không phải ở DB.</summary>
    public int? CustomerId { get; set; }
    public User? Customer { get; set; }

    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }

    public bool IsGuest => CustomerId is null;

    /// <summary>Ngày bắt đầu thuê (inclusive).</summary>
    public DateOnly StartDate { get; set; }

    /// <summary>Ngày trả DỰ KIẾN (exclusive). Số ngày thuê tính giá = EndDate - StartDate.</summary>
    public DateOnly EndDate { get; set; }

    /// <summary>Ngày trả THỰC TẾ — chỉ có giá trị sau khi chuyển sang Returned. Dùng để tính phụ thu trả muộn
    /// (so với EndDate dự kiến). Có thể khác ngày admin bấm nút nếu admin nhập tay ngày trả thực tế.</summary>
    public DateOnly? ActualReturnDate { get; set; }

    /// <summary>Phụ thu trả muộn, tính khi chuyển sang Returned. 0 nếu trả đúng/sớm hạn.</summary>
    public decimal LateFee { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public decimal Subtotal { get; set; }
    public decimal Deposit { get; set; }

    /// <summary>Total = Subtotal + Deposit tại thời điểm ĐẶT (không gồm LateFee — LateFee phát sinh sau, xem
    /// GrandTotal ở DTO để có tổng cuối cùng bao gồm cả phụ thu).</summary>
    public decimal Total { get; set; }

    public string? CustomerNote { get; set; }
    public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Optimistic concurrency cho các thao tác đổi trạng thái đồng thời.</summary>
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<BookingItem> Items { get; set; } = new List<BookingItem>();
}
