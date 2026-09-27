using System.ComponentModel.DataAnnotations;
using BE_UmeClothing.DTOs.Users;

namespace BE_UmeClothing.DTOs.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2 đến 150 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [RegularExpression(@"^\+?[0-9\s\-]{8,20}$", ErrorMessage = "Số điện thoại không hợp lệ.")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 đến 100 ký tự.")]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Mật khẩu phải chứa cả chữ và số.")]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    public string Password { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    [Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2 đến 150 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    [RegularExpression(@"^\+?[0-9\s\-]{8,20}$", ErrorMessage = "Số điện thoại không hợp lệ.")]
    public string? Phone { get; set; }
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu hiện tại.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu mới là bắt buộc.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 đến 100 ký tự.")]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Mật khẩu phải chứa cả chữ và số.")]
    public string NewPassword { get; set; } = string.Empty;
}

public class RefreshRequest
{
    [Required(ErrorMessage = "Refresh token là bắt buộc.")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class LogoutRequest
{
    [Required(ErrorMessage = "Refresh token là bắt buộc.")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class ForgotPasswordRequest
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mã xác nhận là bắt buộc.")]
    [StringLength(10, MinimumLength = 4, ErrorMessage = "Mã xác nhận không hợp lệ.")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu mới là bắt buộc.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 đến 100 ký tự.")]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Mật khẩu phải chứa cả chữ và số.")]
    public string NewPassword { get; set; } = string.Empty;
}

public record AuthResponse(string Token, DateTime ExpiresAt, string RefreshToken, DateTime RefreshTokenExpiresAt, UserDto User);
