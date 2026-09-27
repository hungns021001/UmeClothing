using BE_UmeClothing.Helpers;
using BE_UmeClothing.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace BE_UmeClothing.Services.Implementations;

/// <summary>Định kỳ tự hủy các booking Pending quá hạn giữ lịch.</summary>
public class PendingBookingExpiryService : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly BookingOptions _opt;
    private readonly ILogger<PendingBookingExpiryService> _logger;

    public PendingBookingExpiryService(
        IServiceScopeFactory scopes, IOptions<BookingOptions> options, ILogger<PendingBookingExpiryService> logger)
    {
        _scopes = scopes;
        _opt = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(Math.Max(1, _opt.PendingSweepMinutes)));

        try
        {
            do
            {
                try
                {
                    using var scope = _scopes.CreateScope();
                    var bookings = scope.ServiceProvider.GetRequiredService<IBookingService>();
                    await bookings.ExpirePendingAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Pending booking expiry sweep failed");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // shutting down
        }
    }
}
