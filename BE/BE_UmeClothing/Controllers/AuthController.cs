using BE_UmeClothing.DTOs.Auth;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BE_UmeClothing.Controllers;

[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct) =>
        CreatedSuccess(await _auth.RegisterAsync(request, ct), "Đăng ký thành công.");

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct) =>
        Success(await _auth.LoginAsync(request, ct), "Đăng nhập thành công.");

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct) =>
        Success(await _auth.GetMeAsync(CurrentUserId, ct));

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct) =>
        Success(await _auth.UpdateProfileAsync(CurrentUserId, request, ct), "Đã cập nhật hồ sơ.");

    [HttpPut("password")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        await _auth.ChangePasswordAsync(CurrentUserId, request, ct);
        return Success<object?>(null, "Đã đổi mật khẩu.");
    }

    /// <summary>Dùng refresh token còn hiệu lực để lấy access token mới. Không cần Authorize vì access token
    /// đã hết hạn là lý do gọi endpoint này. Refresh token bị xoay (token cũ vô hiệu, token mới được trả về).</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct) =>
        Success(await _auth.RefreshAsync(request, ct));

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken ct)
    {
        await _auth.LogoutAsync(request, ct);
        return Success<object?>(null, "Đã đăng xuất.");
    }

    /// <summary>Luôn trả 200 dù email có tồn tại hay không, để không lộ email nào đã đăng ký.</summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await _auth.ForgotPasswordAsync(request, ct);
        return Success<object?>(null, "Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi.");
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await _auth.ResetPasswordAsync(request, ct);
        return Success<object?>(null, "Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.");
    }
}
