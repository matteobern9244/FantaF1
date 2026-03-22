using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Persistence;

public interface IPushSubscriptionRepository
{
    Task<PushSubscriptionDocument?> GetByIdAsync(string endpoint, CancellationToken cancellationToken);
    Task<IReadOnlyList<PushSubscriptionDocument>> GetAllAsync(CancellationToken cancellationToken);
    Task AddAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken);
    Task UpdateAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken);
    Task DeleteAsync(string endpoint, CancellationToken cancellationToken);
    Task UpsertAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken);
}
