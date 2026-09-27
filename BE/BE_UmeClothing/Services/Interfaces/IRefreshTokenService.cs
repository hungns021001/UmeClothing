namespace BE_UmeClothing.Services.Interfaces;

public record IssuedRefreshToken(string RawToken, DateTime ExpiresAt);

public interface IRefreshTokenService
{
    Task<IssuedRefreshToken> IssueAsync(int userId, CancellationToken ct = default);

    /// <summary>
    /// Xoay vòng refresh token: nếu hợp lệ, thu hồi token cũ và phát token mới (trả về cùng UserId).
    /// Nếu token đã bị thu hồi trước đó (dấu hiệu bị đánh cắp và dùng lại), thu hồi TOÀN BỘ refresh token
    /// còn hiệu lực của user đó để buộc đăng nhập lại trên mọi thiết bị.
    /// </summary>
    Task<(int UserId, IssuedRefreshToken Token)> RotateAsync(string rawToken, CancellationToken ct = default);

    Task RevokeAsync(string rawToken, CancellationToken ct = default);
    Task RevokeAllForUserAsync(int userId, CancellationToken ct = default);
}
