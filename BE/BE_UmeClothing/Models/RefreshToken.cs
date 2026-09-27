namespace BE_UmeClothing.Models;

/// <summary>
/// Chỉ lưu SHA-256 hash của token, không lưu token gốc (giống cách lưu mật khẩu — nếu DB bị lộ,
/// kẻ tấn công vẫn không dùng được token). Token dùng một lần: mỗi lần refresh sẽ bị thu hồi và
/// thay bằng token mới (rotation), giúp phát hiện token bị đánh cắp qua ReplacedByTokenHash.
/// </summary>
public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;
}
