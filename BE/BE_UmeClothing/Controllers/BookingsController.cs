using BE_UmeClothing.DTOs.Bookings;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BE_UmeClothing.Controllers;

[Route("api/bookings")]
[Authorize]
public class BookingsController : ApiControllerBase
{
    private readonly IBookingService _bookings;

    public BookingsController(IBookingService bookings)
    {
        _bookings = bookings;
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request, CancellationToken ct) =>
        CreatedSuccess(await _bookings.CreateAsync(CurrentUserId, request, ct), "Đặt thuê thành công, đang chờ xác nhận.");

    /// <summary>Đặt thuê không cần tài khoản (guest checkout). Giới hạn tốc độ để chống spam tạo đơn ảo.</summary>
    [HttpPost("guest")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> CreateGuest([FromBody] CreateGuestBookingRequest request, CancellationToken ct) =>
        CreatedSuccess(await _bookings.CreateGuestAsync(request, ct), "Đặt thuê thành công, đang chờ xác nhận.");

    [HttpGet("my")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMy([FromQuery] MyBookingQuery query, CancellationToken ct) =>
        Success(await _bookings.GetMyAsync(CurrentUserId, query, ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        Success(await _bookings.GetForUserAsync(CurrentUserId, IsStaff, id, ct));

    [HttpPut("{id:int}/cancel")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Cancel(int id, CancellationToken ct) =>
        Success(await _bookings.CancelAsync(CurrentUserId, id, ct), "Đã hủy đơn thuê.");

    /// <summary>Tra cứu đơn của khách vãng lai bằng Mã đơn + SĐT. Giới hạn tốc độ để chống dò mã đơn hàng loạt.</summary>
    [HttpPost("lookup")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Lookup([FromBody] BookingLookupRequest request, CancellationToken ct) =>
        Success(await _bookings.LookupGuestAsync(request, ct));

    [HttpPut("lookup/cancel")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> CancelLookup([FromBody] BookingLookupRequest request, CancellationToken ct) =>
        Success(await _bookings.CancelGuestAsync(request, ct), "Đã hủy đơn thuê.");
}
