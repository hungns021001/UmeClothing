namespace BE_UmeClothing.Models;

/// <summary>
/// Mã OTP quên mật khẩu, gửi qua email. Chỉ lưu SHA-256 hash của mã (không lưu mã gốc), giống cách lưu
/// mật khẩu và refresh token — DB bị lộ cũng không dùng lại được mã. Mỗi user chỉ có 1 mã còn hiệu lực tại
/// một thời điểm: yêu cầu mã mới sẽ vô hiệu hóa mã cũ.
/// </summary>
public class PasswordResetCode
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string CodeHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConsumedAt { get; set; }

    /// <summary>Số lần nhập sai. Vượt quá giới hạn thì mã bị khóa dù chưa hết hạn (chống dò mã 6 số).</summary>
    public int Attempts { get; set; }

    public bool IsActive => ConsumedAt is null && ExpiresAt > DateTime.UtcNow;
}
