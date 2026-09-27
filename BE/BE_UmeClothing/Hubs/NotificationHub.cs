using BE_UmeClothing.DTOs.Realtime;
using BE_UmeClothing.Helpers;
using Microsoft.AspNetCore.SignalR;

namespace BE_UmeClothing.Hubs;

/// <summary>
/// Cho phép kết nối ẩn danh để khách xem sản phẩm nhận PRODUCT_AVAILABILITY_CHANGED (dữ liệu công khai).
/// Chỉ kết nối có JWT hợp lệ mới được thêm vào group riêng (user_{id}, admin, staff).
/// Server không có method client-gọi-server nào nên client không thể tự join group.
/// </summary>
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var user = Context.User;

        if (user?.Identity?.IsAuthenticated == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.User(user.GetUserId()));

            if (user.IsInRole("Admin"))
                await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.Admin);

            if (user.IsInRole("Staff"))
                await Groups.AddToGroupAsync(Context.ConnectionId, RealtimeGroups.Staff);
        }

        await base.OnConnectedAsync();
    }
}
