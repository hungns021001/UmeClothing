using BE_UmeClothing.Helpers;
using BE_UmeClothing.Services.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BE_UmeClothing.Services.Implementations;

/// <summary>
/// Gửi email thật qua SMTP chuẩn — dùng được với BẤT KỲ nhà cung cấp nào cấp SMTP relay: Brevo, Mailgun,
/// Amazon SES, Postmark, SMTP nội bộ công ty... Không khóa cứng vào một hãng cụ thể.
///
/// Ví dụ cấu hình cho Brevo (300 email/ngày miễn phí vĩnh viễn, tính đến 2026):
///   Smtp:Host = smtp-relay.brevo.com
///   Smtp:Port = 587
///   Smtp:Username = email đăng nhập tài khoản Brevo của bạn
///   Smtp:Password = SMTP key tạo trong Brevo Dashboard -> SMTP &amp; API -> SMTP (KHÔNG phải mật khẩu đăng nhập)
///
/// Lỗi gửi email bị NUỐT (chỉ log Error), không ném ra ngoài: AuthService.ForgotPasswordAsync phải luôn trả
/// về cùng một kết quả bất kể email có gửi được hay không, để không lộ email nào đã đăng ký (chống user
/// enumeration). Hệ quả: nếu SMTP cấu hình sai, người dùng vẫn thấy "đã gửi mã" dù thực ra không gửi được gì —
/// vì vậy PHẢI theo dõi log Error sau khi cấu hình để biết cấu hình đã đúng hay chưa.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string bodyText, CancellationToken ct = default)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = bodyText };

        try
        {
            using var client = new SmtpClient();
            var socketOptions = _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.SslOnConnect;

            await client.ConnectAsync(_options.Host, _options.Port, socketOptions, ct);
            await client.AuthenticateAsync(_options.Username, _options.Password, ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Không gửi được email tới {Email} (subject: {Subject}). Kiểm tra lại Smtp:* trong cấu hình.", toEmail, subject);
        }
    }
}
