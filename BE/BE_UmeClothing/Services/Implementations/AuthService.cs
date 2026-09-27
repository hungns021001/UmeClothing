using BE_UmeClothing.Data;
using BE_UmeClothing.DTOs.Auth;
using BE_UmeClothing.DTOs.Users;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Mappings;
using BE_UmeClothing.Models;
using BE_UmeClothing.Models.Enums;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace BE_UmeClothing.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IRefreshTokenService _refreshTokens;
    private readonly IEmailSender _email;
    private readonly PasswordResetOptions _resetOptions;

    public AuthService(
        AppDbContext db, ITokenService tokens, IRefreshTokenService refreshTokens,
        IEmailSender email, IOptions<PasswordResetOptions> resetOptions)
    {
        _db = db;
        _tokens = tokens;
        _refreshTokens = refreshTokens;
        _email = email;
        _resetOptions = resetOptions.Value;
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct)
    {
        var (accessToken, accessExpires) = _tokens.CreateToken(user);
        var refresh = await _refreshTokens.IssueAsync(user.Id, ct);
        return new AuthResponse(accessToken, accessExpires, refresh.RawToken, refresh.ExpiresAt, user.ToDto());
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException("Email đã được sử dụng.");

        // Role luôn là Customer: không bao giờ nhận role từ client.
        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            PasswordHash = PasswordHelper.Hash(request.Password),
            Role = UserRole.Customer,
            IsActive = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null)
        {
            PasswordHelper.BurnTime(request.Password);
            throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
        }

        if (!PasswordHelper.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");

        if (!user.IsActive)
            throw new ForbiddenException("Tài khoản đã bị vô hiệu hóa.");

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<UserDto> GetMeAsync(int userId, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("Không tìm thấy người dùng.");
        return user.ToDto();
    }

    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("Không tìm thấy người dùng.");

        // Cố ý KHÔNG cho đổi email ở đây: đổi email cần xác minh (gửi mail xác nhận) để tránh
        // một tài khoản đổi thành email người khác đang dùng hoặc bị chiếm quyền khôi phục mật khẩu.
        // Nếu cần đổi email thật, nên làm luồng riêng có xác minh, không gộp vào form hồ sơ.
        user.FullName = request.FullName.Trim();
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("Không tìm thấy người dùng.");

        if (!PasswordHelper.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BadRequestException("Mật khẩu hiện tại không đúng.");

        if (PasswordHelper.Verify(request.NewPassword, user.PasswordHash))
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại.");

        user.PasswordHash = PasswordHelper.Hash(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        // Đổi mật khẩu là tín hiệu "tôi muốn đăng xuất mọi nơi khác" (ví dụ nghi ngờ lộ mật khẩu).
        await _refreshTokens.RevokeAllForUserAsync(userId, ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var (userId, token) = await _refreshTokens.RotateAsync(request.RefreshToken, ct);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new UnauthorizedException("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");

        if (!user.IsActive)
        {
            // Tài khoản vừa bị khóa: refresh token vừa xoay ở trên vẫn hợp lệ về mặt kỹ thuật, thu hồi lại ngay
            // để không phát sinh phiên mới cho tài khoản đã bị khóa.
            await _refreshTokens.RevokeAsync(token.RawToken, ct);
            throw new ForbiddenException("Tài khoản đã bị vô hiệu hóa.");
        }

        var (accessToken, accessExpires) = _tokens.CreateToken(user);
        return new AuthResponse(accessToken, accessExpires, token.RawToken, token.ExpiresAt, user.ToDto());
    }

    public Task LogoutAsync(LogoutRequest request, CancellationToken ct = default) =>
        _refreshTokens.RevokeAsync(request.RefreshToken, ct);

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Không throw dù không tìm thấy / tài khoản bị khóa: trả 200 giống hệt trường hợp thành công,
        // để không lộ email nào đã đăng ký (user enumeration) qua sự khác biệt của response.
        if (user is null || !user.IsActive)
            return;

        // Chỉ giữ 1 mã hiệu lực tại một thời điểm: vô hiệu hóa mọi mã cũ chưa dùng của user này.
        var now = DateTime.UtcNow;
        await _db.PasswordResetCodes
            .Where(c => c.UserId == user.Id && c.ConsumedAt == null && c.ExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.ConsumedAt, now), ct);

        var code = GenerateNumericCode(_resetOptions.CodeLength);
        _db.PasswordResetCodes.Add(new PasswordResetCode
        {
            UserId = user.Id,
            CodeHash = HashCode(code),
            ExpiresAt = now.AddMinutes(_resetOptions.ExpiryMinutes)
        });
        await _db.SaveChangesAsync(ct);

        await _email.SendAsync(
            user.Email,
            "Mã xác nhận đặt lại mật khẩu — UmeClothing",
            $"Mã xác nhận của bạn là: {code} " +
            "Mã có hiệu lực trong {_resetOptions.ExpiryMinutes} phút. " +
            "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.",
            ct);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Thông điệp lỗi giống nhau dù email không tồn tại hay mã sai, tránh lộ email đã đăng ký.
        const string genericError = "Mã xác nhận không đúng hoặc đã hết hạn.";
        if (user is null)
            throw new BadRequestException(genericError);

        var now = DateTime.UtcNow;
        var active = await _db.PasswordResetCodes
            .Where(c => c.UserId == user.Id && c.ConsumedAt == null && c.ExpiresAt > now)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (active is null)
            throw new BadRequestException(genericError);

        if (active.CodeHash != HashCode(request.Code.Trim()))
        {
            active.Attempts++;
            if (active.Attempts >= _resetOptions.MaxAttempts)
                active.ConsumedAt = now; // khóa mã lại, không cho dò tiếp dù còn hạn
            await _db.SaveChangesAsync(ct);
            throw new BadRequestException(genericError);
        }

        active.ConsumedAt = now;
        user.PasswordHash = PasswordHelper.Hash(request.NewPassword);
        user.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        // Quên mật khẩu thường đi kèm nghi ngờ lộ quyền kiểm soát tài khoản: đăng xuất mọi thiết bị.
        await _refreshTokens.RevokeAllForUserAsync(user.Id, ct);
    }

    private static string GenerateNumericCode(int length)
    {
        var sb = new StringBuilder(length);
        for (var i = 0; i < length; i++)
            sb.Append(RandomNumberGenerator.GetInt32(0, 10));
        return sb.ToString();
    }

    private static string HashCode(string code) => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
}
