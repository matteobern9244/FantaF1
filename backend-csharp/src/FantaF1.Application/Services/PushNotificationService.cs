using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;

namespace FantaF1.Application.Services;

public sealed class PushNotificationService : IPushNotificationService
{
    private readonly IPushDeliveryGateway _pushDeliveryGateway;
    private readonly IPushSubscriptionRepository _pushSubscriptionRepository;

    public PushNotificationService(
        IPushSubscriptionRepository pushSubscriptionRepository,
        IPushDeliveryGateway pushDeliveryGateway)
    {
        _pushSubscriptionRepository = pushSubscriptionRepository
            ?? throw new ArgumentNullException(nameof(pushSubscriptionRepository));
        _pushDeliveryGateway = pushDeliveryGateway
            ?? throw new ArgumentNullException(nameof(pushDeliveryGateway));
    }

    public PushNotificationClientConfiguration GetClientConfiguration()
    {
        return _pushDeliveryGateway.GetClientConfiguration();
    }

    public async Task SendTestNotificationAsync(string endpoint, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(endpoint);

        var trimmedEndpoint = endpoint.Trim();
        var subscription = await _pushSubscriptionRepository.GetByIdAsync(trimmedEndpoint, cancellationToken);
        if (subscription is null)
        {
            throw new PushSubscriptionNotFoundException(trimmedEndpoint);
        }

        try
        {
            await _pushDeliveryGateway.SendAsync(
                subscription,
                new PushNotificationPayload(
                    PushNotificationsContract.TestNotificationTitle,
                    PushNotificationsContract.TestNotificationBody,
                    PushNotificationsContract.TestNotificationUrl,
                    PushNotificationsContract.TestNotificationTag),
                cancellationToken);
        }
        catch (PushDeliveryFailedException exception)
        {
            if (exception.DeleteSubscription)
            {
                await _pushSubscriptionRepository.DeleteAsync(trimmedEndpoint, cancellationToken);
            }

            throw;
        }
    }
}
