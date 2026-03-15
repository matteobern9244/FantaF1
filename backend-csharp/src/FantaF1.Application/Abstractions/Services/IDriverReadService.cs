using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IDriverReadService
{
    Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken);
}
