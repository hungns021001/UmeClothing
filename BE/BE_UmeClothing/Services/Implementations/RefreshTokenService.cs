using System.Security.Cryptography;
using BE_UmeClothing.Data;
using BE_UmeClothing.Helpers;
using BE_UmeClothing.Models;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BE_UmeClothing.Services.Implementations;

public class RefreshTokenService : IRefreshTokenService
{
    private readonly AppDbContext _db;
    private readonly JwtSettings _jwt;

    public RefreshTokenService(AppDbContext db, IOptions<JwtSettings> jwt)
    {
        _db = db;
        _jwt = jwt.Value;
    }

    public async Task<IssuedRefreshToken> IssueAsync(int userId, CancellationToken ct = default)
    {
        var raw = GenerateRawToken();
        var expiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays);

        _db.RefreshTokens.Add(new RefreshToken { UserId = userId, TokenHash = Hash(raw), ExpiresAt = expiresAt });
        await _db.SaveChangesAsync(ct);

        return new IssuedRefreshToken(raw, expiresAt);
    }

    public async Task<(int UserId, IssuedRefreshToken Token)> RotateAsync(string rawToken, CancellationToken ct = default)
    {
        var hash = Hash(rawToken);
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (existing is null)
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");

        if (existing.RevokedAt is not null)
        {
            // Token đã bị thu hồi (đã dùng để rotate trước đó, hoặc bị admin khóa) nhưng vẫn có người dùng lại nó:
            // dấu hiệu token bị đánh cắp. Coi mọi refresh token của user này là khả nghi và thu hồi hết.
            await RevokeAllForUserAsync(existing.UserId, ct);
            throw new UnauthorizedException("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
        }

        if (existing.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

        var next = GenerateRawToken();
        var nextHash = Hash(next);
        var expiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays);

        existing.RevokedAt = DateTime.UtcNow;
        existing.ReplacedByTokenHash = nextHash;
        _db.RefreshTokens.Add(new RefreshToken { UserId = existing.UserId, TokenHash = nextHash, ExpiresAt = expiresAt });
        await _db.SaveChangesAsync(ct);

        return (existing.UserId, new IssuedRefreshToken(next, expiresAt));
    }

    public async Task RevokeAsync(string rawToken, CancellationToken ct = default)
    {
        var hash = Hash(rawToken);
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (existing is null || existing.RevokedAt is not null)
            return; // logout im lặng thành công dù token không tồn tại/đã thu hồi (idempotent)

        existing.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeAllForUserAsync(int userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
    }

    private static string GenerateRawToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string Hash(string rawToken) => Convert.ToBase64String(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)));
}
