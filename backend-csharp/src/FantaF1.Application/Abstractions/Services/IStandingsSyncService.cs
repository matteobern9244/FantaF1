using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IStandingsSyncService
{
    Task<StandingsDocument> SyncAsync(CancellationToken cancellationToken);
}
