using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface IPushDeliveryGateway
{
    PushNotificationClientConfiguration GetClientConfiguration();
    Task SendAsync(PushSubscriptionDocument subscription, PushNotificationPayload payload, CancellationToken cancellationToken);
}
