using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Persistence;

public interface IDriverRepository
{
    Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken);

    Task WriteAllAsync(IReadOnlyList<DriverDocument> drivers, CancellationToken cancellationToken);
}
