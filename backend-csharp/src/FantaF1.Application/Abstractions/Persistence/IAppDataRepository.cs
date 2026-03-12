using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Persistence;

public interface IAppDataRepository
{
    Task<AppDataDocument?> ReadLatestAsync(CancellationToken cancellationToken);
}
