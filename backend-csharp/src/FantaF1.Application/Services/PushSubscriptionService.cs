using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Services;

public sealed class PushSubscriptionService : IPushSubscriptionService
{
    private readonly IPushSubscriptionRepository _pushSubscriptionRepository;

    public PushSubscriptionService(IPushSubscriptionRepository pushSubscriptionRepository)
    {
        _pushSubscriptionRepository = pushSubscriptionRepository
            ?? throw new ArgumentNullException(nameof(pushSubscriptionRepository));
    }

    public async Task SubscribeAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(subscription);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscription.Endpoint, nameof(subscription));

        var normalizedSubscription = subscription with { Endpoint = subscription.Endpoint.Trim() };
        await _pushSubscriptionRepository.UpsertAsync(normalizedSubscription, cancellationToken);
    }

    public async Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(endpoint, nameof(endpoint));

        await _pushSubscriptionRepository.DeleteAsync(endpoint.Trim(), cancellationToken);
    }
}
