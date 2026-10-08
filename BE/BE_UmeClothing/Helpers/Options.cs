namespace BE_UmeClothing.Helpers;

public class JwtSettings
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "UmeClothing";
    public string Audience { get; set; } = "UmeClothing.Client";

    /// <summary>Thời hạn access token (JWT). Ngắn vì không có cách thu hồi JWT giữa chừng —
    /// refresh token là cơ chế bù lại để người dùng không phải đăng nhập lại liên tục.</summary>
    public int ExpiryMinutes { get; set; } = 15;

    /// <summary>Thời hạn refresh token. Có thể thu hồi (DB-backed) nên có thể dài hơn nhiều so với access token.</summary>
    public int RefreshTokenExpiryDays { get; set; } = 30;
}

public class BookingOptions
{
    /// <summary>Số ngày đệm (giặt ủi/vận chuyển) trước và sau mỗi booking.</summary>
    public int BufferDays { get; set; } = 1;

    /// <summary>Booking Pending quá số giờ này sẽ không còn giữ lịch và bị tự động hủy.</summary>
    public int PendingHoldHours { get; set; } = 24;

    public int MaxRentalDays { get; set; } = 30;
    public int MaxItemsPerBooking { get; set; } = 10;

    /// <summary>Múi giờ nghiệp vụ (VN = 7) để xác định "hôm nay".</summary>
    public int UtcOffsetHours { get; set; } = 7;

    public int PendingSweepMinutes { get; set; } = 5;

    /// <summary>Phụ thu trả muộn = RentalPrice/ngày của từng item × số ngày trễ × hệ số này.
    /// Mặc định 1.0 = tính bằng đúng giá thuê ngày thường cho mỗi ngày trễ.</summary>
    public decimal LateFeeMultiplier { get; set; } = 1.0m;

    public DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(UtcOffsetHours));
}

public class PasswordResetOptions
{
    public int CodeLength { get; set; } = 6;
    public int ExpiryMinutes { get; set; } = 15;

    /// <summary>Số lần nhập sai mã tối đa trước khi mã bị khóa (chống dò mã 6 số bằng brute force).</summary>
    public int MaxAttempts { get; set; } = 5;
}

public class SmtpOptions
{
    /// <summary>Để trống = chưa cấu hình SMTP thật, hệ thống tự dùng LoggingEmailSender (chỉ ghi log, không gửi).</summary>
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "no-reply@umeclothing.com";
    public string FromName { get; set; } = "UmeClothing";

    /// <summary>true = STARTTLS trên cổng 587 (phổ biến nhất: Brevo, Mailgun, Amazon SES, Gmail SMTP relay).
    /// false = TLS ngay từ đầu, dùng cho cổng 465 (SSL trực tiếp) nếu nhà cung cấp yêu cầu.</summary>
    public bool UseStartTls { get; set; } = true;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);
}

public class ImageStorageOptions
{
    public long MaxFileSizeBytes { get; set; } = 5 * 1024 * 1024;
    public int MaxImagesPerProduct { get; set; } = 10;
}
