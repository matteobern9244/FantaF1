using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Services;

public sealed class StandingsSyncService : IStandingsSyncService
{
    private readonly IStandingsRepository _standingsRepository;
    private readonly IDriverRepository _driverRepository;
    private readonly IStandingsSourceClient _standingsSourceClient;
    private readonly IStandingsParser _standingsParser;
    private readonly IClock _clock;

    public StandingsSyncService(
        IStandingsRepository standingsRepository,
        IDriverRepository driverRepository,
        IStandingsSourceClient standingsSourceClient,
        IStandingsParser standingsParser,
        IClock clock)
    {
        _standingsRepository = standingsRepository ?? throw new ArgumentNullException(nameof(standingsRepository));
        _driverRepository = driverRepository ?? throw new ArgumentNullException(nameof(driverRepository));
        _standingsSourceClient = standingsSourceClient ?? throw new ArgumentNullException(nameof(standingsSourceClient));
        _standingsParser = standingsParser ?? throw new ArgumentNullException(nameof(standingsParser));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public async Task<StandingsDocument> SyncAsync(CancellationToken cancellationToken)
    {
        try
        {
            var driversTask = _driverRepository.ReadAllAsync(cancellationToken);
            var driverHtmlTask = _standingsSourceClient.FetchDriverStandingsHtmlAsync(cancellationToken);
            var constructorHtmlTask = _standingsSourceClient.FetchConstructorStandingsHtmlAsync(cancellationToken);

            await Task.WhenAll(driversTask, driverHtmlTask, constructorHtmlTask);

            var document = new StandingsDocument(
                _standingsParser.ParseDriverStandings(await driverHtmlTask, await driversTask),
                _standingsParser.ParseConstructorStandings(await constructorHtmlTask),
                _clock.UtcNow.ToString("O"));

            if (document.DriverStandings.Count == 0 || document.ConstructorStandings.Count == 0)
            {
                throw new InvalidOperationException("Invalid standings source");
            }

            try
            {
                await _standingsRepository.WriteCurrentAsync(document, cancellationToken);
            }
            catch
            {
                // Node keeps the freshly parsed payload even when the cache write fails.
            }

            return document;
        }
        catch
        {
            return await _standingsRepository.ReadCurrentAsync(cancellationToken);
        }
    }
}
