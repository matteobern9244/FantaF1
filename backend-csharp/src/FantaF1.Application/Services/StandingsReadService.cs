using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Services;

public sealed class StandingsReadService : IStandingsReadService
{
    private readonly IStandingsRepository _standingsRepository;
    private readonly IStandingsSyncService _standingsSyncService;

    public StandingsReadService(
        IStandingsRepository standingsRepository,
        IStandingsSyncService standingsSyncService)
    {
        _standingsRepository = standingsRepository ?? throw new ArgumentNullException(nameof(standingsRepository));
        _standingsSyncService = standingsSyncService ?? throw new ArgumentNullException(nameof(standingsSyncService));
    }

    public async Task<StandingsDocument> ReadAsync(CancellationToken cancellationToken)
    {
        var standings = await _standingsRepository.ReadCurrentAsync(cancellationToken);
        var hasCachedStandings =
            standings.DriverStandings.Count > 0
            || standings.ConstructorStandings.Count > 0;

        return hasCachedStandings
            ? standings
            : await _standingsSyncService.SyncAsync(cancellationToken);
    }
}
