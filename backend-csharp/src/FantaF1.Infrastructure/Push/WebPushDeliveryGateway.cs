using System.Net;
using System.Text.Json;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.Extensions.Options;
using WebPush;

namespace FantaF1.Infrastructure.Push;

public sealed class WebPushDeliveryGateway : IPushDeliveryGateway
{
    private readonly IWebPushClientAdapter _client;
    private readonly WebPushOptions _options;

    public WebPushDeliveryGateway(
        IOptions<WebPushOptions> options)
        : this(options, new WebPushClientAdapter(new WebPushClient()))
    {
    }

    public WebPushDeliveryGateway(
        IOptions<WebPushOptions> options,
        IWebPushClientAdapter client)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(client);
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _client = client;
    }

    public PushNotificationClientConfiguration GetClientConfiguration()
    {
        return new PushNotificationClientConfiguration(_options.IsConfigured, _options.PublicKey);
    }

    public async Task SendAsync(
        PushSubscriptionDocument subscription,
        PushNotificationPayload message,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(subscription);
        ArgumentNullException.ThrowIfNull(message);

        if (!_options.IsConfigured)
        {
            throw new PushDeliveryFailedException("Web push delivery is not configured.", deleteSubscription: false);
        }

        try
        {
            await _client.SendNotificationAsync(
                new PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth),
                JsonSerializer.Serialize(message),
                new VapidDetails(_options.Subject, _options.PublicKey, _options.PrivateKey),
                cancellationToken);
        }
        catch (WebPushException exception) when (
            exception.StatusCode == HttpStatusCode.Gone
            || exception.StatusCode == HttpStatusCode.NotFound)
        {
            throw new PushDeliveryFailedException(exception.Message, deleteSubscription: true);
        }
        catch (WebPushException exception)
        {
            throw new PushDeliveryFailedException(exception.Message, deleteSubscription: false);
        }
    }
}
