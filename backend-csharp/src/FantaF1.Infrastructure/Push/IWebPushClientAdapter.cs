using WebPush;

namespace FantaF1.Infrastructure.Push;

public interface IWebPushClientAdapter
{
    Task SendNotificationAsync(
        PushSubscription subscription,
        string payload,
        VapidDetails vapidDetails,
        CancellationToken cancellationToken);
}
