using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.DTOs.Admin;

public record DashboardStatsDto(
    int TotalProducts, int TotalCustomers, int TotalBookings,
    int PendingBookings, int ConfirmedBookings, int RentingBookings,
    int ReturnedBookings, int CompletedBookings, int CancelledBookings,
    decimal Revenue);

public record CustomerListItemDto(int Id, string FullName, string Email, string? Phone, bool IsActive, DateTime CreatedAt, int BookingCount);

public record CalendarItemDto(
    int BookingId, string BookingCode, int VariantId, int ProductId, string ProductName, string Size,
    DateOnly StartDate, DateOnly EndDate, BookingStatus Status, string CustomerName);

public class SetCustomerActiveRequest
{
    public bool IsActive { get; set; }
}

public class CustomerQuery
{
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
