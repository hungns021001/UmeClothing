using BE_UmeClothing.DTOs.Admin;
using BE_UmeClothing.DTOs.Common;

namespace BE_UmeClothing.Services.Interfaces;

public interface IAdminService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync(CancellationToken ct = default);
    Task<PagedResult<CustomerListItemDto>> GetCustomersAsync(CustomerQuery query, CancellationToken ct = default);
    Task<List<CalendarItemDto>> GetCalendarAsync(DateOnly from, DateOnly to, int? productId, CancellationToken ct = default);

    /// <summary>Doanh thu theo ngày/tuần/tháng, chỉ tính đơn Completed. groupBy: "day" | "week" | "month".</summary>
    Task<RevenueReportDto> GetRevenueReportAsync(DateOnly from, DateOnly to, string groupBy, CancellationToken ct = default);

    /// <summary>Khóa/mở khóa tài khoản customer. JWT đã phát hành trước đó KHÔNG bị thu hồi ngay
    /// (giới hạn đã biết: không có cơ chế revoke token) — có hiệu lực từ lần request tiếp theo sau khi token hết hạn,
    /// hoặc ngay lập tức cho các request mới cần đăng nhập lại.</summary>
    Task<CustomerListItemDto> SetCustomerActiveAsync(int customerId, bool isActive, CancellationToken ct = default);
}
