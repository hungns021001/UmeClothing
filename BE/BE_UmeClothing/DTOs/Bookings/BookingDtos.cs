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

/// <summary>Frontend KHÔNG gửi giá/tổng tiền/số lượng: backend tự tính.</summary>
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

public class UpdateBookingStatusRequest
{
    public BookingStatus Status { get; set; }

    [StringLength(1000)]
    public string? AdminNote { get; set; }
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

/// <summary>DTO cho customer: không có AdminNote.</summary>
public record BookingDto(
    int Id, string BookingCode, DateOnly StartDate, DateOnly EndDate, BookingStatus Status,
    decimal Subtotal, decimal Deposit, decimal Total, string? CustomerNote,
    DateTime CreatedAt, DateTime UpdatedAt, List<BookingItemDto> Items);

public record AdminBookingDto(
    int Id, string BookingCode, int CustomerId, string CustomerName, string CustomerEmail, string? CustomerPhone,
    DateOnly StartDate, DateOnly EndDate, BookingStatus Status,
    decimal Subtotal, decimal Deposit, decimal Total, string? CustomerNote, string? AdminNote,
    DateTime CreatedAt, DateTime UpdatedAt, List<BookingItemDto> Items);
