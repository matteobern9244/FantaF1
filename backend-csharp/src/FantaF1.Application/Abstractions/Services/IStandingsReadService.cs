using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IStandingsReadService
{
    Task<StandingsDocument> ReadAsync(CancellationToken cancellationToken);
}
