using System.ComponentModel.DataAnnotations;
using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.DTOs.Bookings;

public class CreateBookingItemRequest
{
    /// <summary>Trỏ tới size cụ thể (ProductVariant), không phải Product.</summary>
    [Range(1, int.MaxValue, ErrorMessage = "Sản phẩm/size không hợp lệ.")]
    public int VariantId { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

/// <summary>Frontend KHÔNG gửi giá/tổng tiền/số lượng: backend tự tính. Dùng cho khách đã đăng nhập (CustomerId lấy từ JWT).</summary>
public class CreateBookingRequest
{
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    [StringLength(1000)]
    public string? CustomerNote { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "Cần chọn ít nhất 1 sản phẩm.")]
    public List<CreateBookingItemRequest> Items { get; set; } = new();
}

/// <summary>Đặt thuê không cần tài khoản (guest checkout). Bắt buộc Tên + SĐT để sau này tra cứu đơn.</summary>
public class CreateGuestBookingRequest
{
    [Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2 đến 150 ký tự.")]
    public string GuestName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Số điện thoại là bắt buộc.")]
    [RegularExpression(@"^\+?[0-9\s\-]{8,20}$", ErrorMessage = "Số điện thoại không hợp lệ.")]
    public string GuestPhone { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    [StringLength(1000)]
    public string? CustomerNote { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "Cần chọn ít nhất 1 sản phẩm.")]
    public List<CreateBookingItemRequest> Items { get; set; } = new();
}

/// <summary>Tra cứu đơn của khách vãng lai: cần đúng cả mã đơn LẪN số điện thoại (chống dò mã đơn của người khác).</summary>
public class BookingLookupRequest
{
    [Required(ErrorMessage = "Mã đơn là bắt buộc.")]
    [StringLength(30)]
    public string BookingCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Số điện thoại là bắt buộc.")]
    [StringLength(20)]
    public string Phone { get; set; } = string.Empty;
}

public class UpdateBookingStatusRequest
{
    public BookingStatus Status { get; set; }

    [StringLength(1000)]
    public string? AdminNote { get; set; }

    /// <summary>Chỉ dùng khi Status = Returned. Ngày trả thực tế, mặc định là hôm nay nếu không truyền.
    /// Dùng để tính phụ thu trả muộn (so với EndDate dự kiến của đơn).</summary>
    public DateOnly? ActualReturnDate { get; set; }
}

public class MyBookingQuery
{
    public BookingStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class AdminBookingQuery
{
    public BookingStatus? Status { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public record BookingItemDto(
    int Id, int VariantId, int ProductId, string ProductName, string ProductSlug, string Size,
    string? PrimaryImageUrl, decimal RentalPrice, decimal DepositPrice, int Quantity,
    DateOnly StartDate, DateOnly EndDate, int Days, string? Note);

/// <summary>DTO cho customer/guest: không có AdminNote, không có PII của khách khác.</summary>
public record BookingDto(
    int Id, string BookingCode, DateOnly StartDate, DateOnly EndDate, DateOnly? ActualReturnDate,
    BookingStatus Status, decimal Subtotal, decimal Deposit, decimal LateFee, decimal Total, decimal GrandTotal,
    string? CustomerNote, DateTime CreatedAt, DateTime UpdatedAt, List<BookingItemDto> Items);

public record AdminBookingDto(
    int Id, string BookingCode, bool IsGuest, int? CustomerId, string CustomerName, string? CustomerEmail, string? CustomerPhone,
    DateOnly StartDate, DateOnly EndDate, DateOnly? ActualReturnDate, BookingStatus Status,
    decimal Subtotal, decimal Deposit, decimal LateFee, decimal Total, decimal GrandTotal,
    string? CustomerNote, string? AdminNote, DateTime CreatedAt, DateTime UpdatedAt, List<BookingItemDto> Items);
