using BE_UmeClothing.DTOs.Admin;
using BE_UmeClothing.DTOs.Realtime;

namespace BE_UmeClothing.Services.Interfaces;

/// <summary>Chỉ đẩy sự kiện realtime. Mọi lỗi được nuốt + log để không làm hỏng nghiệp vụ đã commit.</summary>
public interface IRealtimeNotifier
{
    Task BookingCreatedAsync(BookingCreatedEvent e);
    Task BookingStatusChangedAsync(int customerId, BookingStatusChangedEvent e);
    Task ProductAvailabilityChangedAsync(IEnumerable<ProductAvailabilityChangedEvent> events);
    Task DashboardUpdatedAsync(DashboardStatsDto stats);
}
