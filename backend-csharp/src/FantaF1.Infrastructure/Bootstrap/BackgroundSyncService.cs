using FantaF1.Application.Abstractions.Services;
using FantaF1.Infrastructure.Calendar;
using FantaF1.Infrastructure.Drivers;
using Microsoft.Extensions.Logging;

namespace FantaF1.Infrastructure.Bootstrap;

public sealed class BackgroundSyncService : IBackgroundSyncService
{
    private readonly OfficialDriverSyncService _driverSyncService;
    private readonly OfficialCalendarSyncService _calendarSyncService;
    private readonly IStandingsSyncService _standingsSyncService;
    private readonly ILogger<BackgroundSyncService> _logger;

    public BackgroundSyncService(
        OfficialDriverSyncService driverSyncService,
        OfficialCalendarSyncService calendarSyncService,
        IStandingsSyncService standingsSyncService,
        ILogger<BackgroundSyncService> logger)
    {
        _driverSyncService = driverSyncService ?? throw new ArgumentNullException(nameof(driverSyncService));
        _calendarSyncService = calendarSyncService ?? throw new ArgumentNullException(nameof(calendarSyncService));
        _standingsSyncService = standingsSyncService ?? throw new ArgumentNullException(nameof(standingsSyncService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _driverSyncService.SyncAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Driver sync failed during bootstrap.");
        }

        try
        {
            await _calendarSyncService.SyncAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Calendar sync failed during bootstrap.");
        }

        try
        {
            await _standingsSyncService.SyncAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Standings sync failed during bootstrap.");
        }
    }
}
