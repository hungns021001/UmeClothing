using BE_UmeClothing.Services.Interfaces;

namespace BE_UmeClothing.Services.Implementations;

/// <summary>Chỉ ghi log, KHÔNG gửi email thật. Xem ghi chú tại IEmailSender.</summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string toEmail, string subject, string bodyText, CancellationToken ct = default)
    {
        _logger.LogWarning(
            "[DEV EMAIL — KHÔNG gửi thật] To: {Email} | Subject: {Subject}\n{Body}",
            toEmail, subject, bodyText);
        return Task.CompletedTask;
    }
}
