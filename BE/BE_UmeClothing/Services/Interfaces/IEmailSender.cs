namespace BE_UmeClothing.Services.Interfaces;

/// <summary>
/// Gửi email. Triển khai mặc định (LoggingEmailSender) KHÔNG gửi email thật, chỉ ghi log — đủ để phát triển
/// và kiểm thử quên mật khẩu (mã OTP hiện trong log console của backend) nhưng KHÔNG dùng được cho production.
/// Production cần một triển khai thật (SMTP, SendGrid, Amazon SES...) implement interface này rồi đăng ký
/// thay thế trong Program.cs, giống cách IImageStorageService được thiết kế để đổi sang Cloudinary/R2.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string bodyText, CancellationToken ct = default);
}
