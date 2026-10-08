using BE_UmeClothing.DTOs.Admin;
using BE_UmeClothing.DTOs.Realtime;
using BE_UmeClothing.Hubs;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace BE_UmeClothing.Services.Implementations;

public class RealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<NotificationHub> _hub;
    private readonly ILogger<RealtimeNotifier> _logger;

    public RealtimeNotifier(IHubContext<NotificationHub> hub, ILogger<RealtimeNotifier> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public Task BookingCreatedAsync(BookingCreatedEvent e) =>
        SafeAsync(RealtimeEvents.BookingCreated,
            () => _hub.Clients.Groups(RealtimeGroups.Admin, RealtimeGroups.Staff).SendAsync(RealtimeEvents.BookingCreated, e));

    /// <summary>Gửi cho đúng customer sở hữu booking + Admin/Staff (để danh sách admin cập nhật ngay). Payload không chứa dữ liệu riêng tư.</summary>
    public Task BookingStatusChangedAsync(int? customerId, BookingStatusChangedEvent e)
    {
        var groups = customerId.HasValue
            ? new[] { RealtimeGroups.User(customerId.Value), RealtimeGroups.Admin, RealtimeGroups.Staff }
            : new[] { RealtimeGroups.Admin, RealtimeGroups.Staff }; // guest: không có group riêng để báo

        return SafeAsync(RealtimeEvents.BookingStatusChanged, () => _hub.Clients.Groups(groups).SendAsync(RealtimeEvents.BookingStatusChanged, e));
    }

    /// <summary>Broadcast cho mọi client đang kết nối: payload chỉ có ProductId + khoảng ngày.</summary>
    public async Task ProductAvailabilityChangedAsync(IEnumerable<ProductAvailabilityChangedEvent> events)
    {
        foreach (var e in events)
        {
            await SafeAsync(RealtimeEvents.ProductAvailabilityChanged,
                () => _hub.Clients.All.SendAsync(RealtimeEvents.ProductAvailabilityChanged, e));
        }
    }

    public Task DashboardUpdatedAsync(DashboardStatsDto stats) =>
        SafeAsync(RealtimeEvents.DashboardUpdated,
            () => _hub.Clients.Groups(RealtimeGroups.Admin, RealtimeGroups.Staff).SendAsync(RealtimeEvents.DashboardUpdated, stats));

    private async Task SafeAsync(string eventName, Func<Task> send)
    {
        try
        {
            await send();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish realtime event {Event}", eventName);
        }
    }
}
