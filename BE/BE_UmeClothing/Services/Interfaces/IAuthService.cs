using BE_UmeClothing.DTOs.Auth;
using BE_UmeClothing.DTOs.Users;

namespace BE_UmeClothing.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<UserDto> GetMeAsync(int userId, CancellationToken ct = default);
    Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct = default);

    /// <summary>Đổi mật khẩu. Thu hồi toàn bộ refresh token hiện có của user (buộc đăng nhập lại trên mọi thiết bị
    /// khác), nhưng KHÔNG thu hồi được access token (JWT) đang dùng dở ở nơi khác — nó vẫn hiệu lực đến khi hết hạn
    /// (tối đa Jwt:ExpiryMinutes, mặc định 15 phút).</summary>
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default);

    Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default);
    Task LogoutAsync(LogoutRequest request, CancellationToken ct = default);

    /// <summary>Luôn trả về thành công dù email có tồn tại hay không (chống dò email đã đăng ký).
    /// Nếu email tồn tại và tài khoản đang hoạt động, gửi mã OTP 6 số qua email, hiệu lực trong
    /// PasswordReset:ExpiryMinutes phút.</summary>
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default);

    /// <summary>Đặt lại mật khẩu bằng mã OTP. Thành công thì thu hồi toàn bộ refresh token của user
    /// (đăng xuất mọi thiết bị) — hợp lý vì quên mật khẩu thường đi kèm nghi ngờ mất quyền kiểm soát tài khoản.</summary>
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
}
