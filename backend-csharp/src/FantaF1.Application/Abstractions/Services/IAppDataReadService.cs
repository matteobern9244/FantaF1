using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IAppDataReadService
{
    Task<AppDataDocument> ReadAsync(CancellationToken cancellationToken);
}
