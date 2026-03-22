namespace FantaF1.Application.Abstractions.Services;

public interface IPushNotificationService
{
    PushNotificationClientConfiguration GetClientConfiguration();
    Task SendTestNotificationAsync(string endpoint, CancellationToken cancellationToken);
}
