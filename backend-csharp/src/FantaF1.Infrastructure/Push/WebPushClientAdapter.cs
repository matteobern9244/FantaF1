using WebPush;

namespace FantaF1.Infrastructure.Push;

public sealed class WebPushClientAdapter : IWebPushClientAdapter
{
    private readonly WebPushClient _client;

    public WebPushClientAdapter(WebPushClient client)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
    }

    public Task SendNotificationAsync(
        PushSubscription subscription,
        string payload,
        VapidDetails vapidDetails,
        CancellationToken cancellationToken)
    {
        return _client.SendNotificationAsync(subscription, payload, vapidDetails);
    }
}
