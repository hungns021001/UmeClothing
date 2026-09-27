using BE_UmeClothing.DTOs.Bookings;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE_UmeClothing.Controllers;

[Route("api/admin/bookings")]
[Authorize(Roles = "Admin,Staff")]
public class AdminBookingsController : ApiControllerBase
{
    private readonly IBookingService _bookings;

    public AdminBookingsController(IBookingService bookings)
    {
        _bookings = bookings;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] AdminBookingQuery query, CancellationToken ct) =>
        Success(await _bookings.GetAdminListAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        Success(await _bookings.GetAdminAsync(id, ct));

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateBookingStatusRequest request, CancellationToken ct) =>
        Success(await _bookings.UpdateStatusAsync(id, request, ct), "Đã cập nhật trạng thái đơn.");
}
