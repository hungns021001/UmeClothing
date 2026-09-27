using BE_UmeClothing.Models.Enums;

namespace BE_UmeClothing.DTOs.Realtime;

public record BookingCreatedEvent(int BookingId, string BookingCode, string CustomerName, DateTime CreatedAt, BookingStatus Status);

public record BookingStatusChangedEvent(int BookingId, string BookingCode, BookingStatus OldStatus, BookingStatus NewStatus, DateTime UpdatedAt);

public record ProductAvailabilityChangedEvent(int ProductId, int VariantId, DateOnly StartDate, DateOnly EndDate);

public static class RealtimeEvents
{
    public const string BookingCreated = "BOOKING_CREATED";
    public const string BookingStatusChanged = "BOOKING_STATUS_CHANGED";
    public const string ProductAvailabilityChanged = "PRODUCT_AVAILABILITY_CHANGED";
    public const string DashboardUpdated = "DASHBOARD_UPDATED";
}

public static class RealtimeGroups
{
    public const string Admin = "admin";
    public const string Staff = "staff";
    public static string User(int userId) => $"user_{userId}";
}
