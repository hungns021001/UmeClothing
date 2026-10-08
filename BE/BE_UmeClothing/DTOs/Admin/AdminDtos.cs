using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.DTOs.Admin;

public record DashboardStatsDto(
    int TotalProducts, int TotalCustomers, int TotalBookings,
    int PendingBookings, int ConfirmedBookings, int RentingBookings,
    int ReturnedBookings, int CompletedBookings, int CancelledBookings,
    decimal Revenue);

/// <summary>Doanh thu = Subtotal + LateFee của các đơn Completed, gộp theo "period" bắt đầu tại PeriodStart.
/// day: mỗi ngày 1 dòng. week: PeriodStart là Thứ 2 của tuần đó. month: PeriodStart là ngày 1 của tháng đó.</summary>
public record RevenuePeriodDto(DateOnly PeriodStart, decimal RentalRevenue, decimal LateFeeRevenue, decimal TotalRevenue, int BookingCount);

public record RevenueReportDto(string GroupBy, DateOnly From, DateOnly To, decimal GrandTotal, List<RevenuePeriodDto> Periods);

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
