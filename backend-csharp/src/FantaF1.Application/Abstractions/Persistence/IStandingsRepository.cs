using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Persistence;

public interface IStandingsRepository : IRepository<StandingsDocument, string>
{
    Task<StandingsDocument> ReadCurrentAsync(CancellationToken cancellationToken);
    Task WriteCurrentAsync(StandingsDocument document, CancellationToken cancellationToken);
}

