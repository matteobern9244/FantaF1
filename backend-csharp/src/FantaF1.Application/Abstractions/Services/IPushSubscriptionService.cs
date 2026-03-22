using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IPushSubscriptionService
{
    Task SubscribeAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken);
    Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken);
}
