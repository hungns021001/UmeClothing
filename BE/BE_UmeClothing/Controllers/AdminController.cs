using BE_UmeClothing.DTOs.Admin;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE_UmeClothing.Controllers;

[Route("api/admin")]
[Authorize(Roles = "Admin,Staff")]
public class AdminController : ApiControllerBase
{
    private readonly IAdminService _admin;

    public AdminController(IAdminService admin)
    {
        _admin = admin;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct) =>
        Success(await _admin.GetDashboardStatsAsync(ct));

    [HttpGet("customers")]
    public async Task<IActionResult> Customers([FromQuery] CustomerQuery query, CancellationToken ct) =>
        Success(await _admin.GetCustomersAsync(query, ct));

    /// <summary>Lịch thuê trong [from, to). Không gồm booking Cancelled.</summary>
    [HttpGet("calendar")]
    public async Task<IActionResult> Calendar(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] int? productId, CancellationToken ct) =>
        Success(await _admin.GetCalendarAsync(from, to, productId, ct));

    /// <summary>Chỉ Admin: khóa/mở khóa tài khoản khách hàng là thao tác nhạy cảm, ảnh hưởng quyền truy cập của người khác.</summary>
    [HttpPut("customers/{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetCustomerStatus(int id, [FromBody] SetCustomerActiveRequest request, CancellationToken ct) =>
        Success(await _admin.SetCustomerActiveAsync(id, request.IsActive, ct), request.IsActive ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");

    /// <summary>Doanh thu theo kỳ. groupBy: day | week | month (mặc định day).</summary>
    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, [FromQuery] string groupBy = "day", CancellationToken ct = default) =>
        Success(await _admin.GetRevenueReportAsync(from, to, groupBy, ct));
}
