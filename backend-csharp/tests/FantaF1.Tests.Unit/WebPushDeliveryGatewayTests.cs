using System.Net;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Push;
using Microsoft.Extensions.Options;
using WebPush;

namespace FantaF1.Tests.Unit;

public sealed class WebPushDeliveryGatewayTests
{
    [Fact]
    public void Constructors_reject_options_without_a_value()
    {
        Assert.Throws<ArgumentNullException>(() => new WebPushDeliveryGateway(new NullWebPushOptions(), new StubWebPushClientAdapter()));
    }

    [Fact]
    public void Constructors_reject_null_dependencies()
    {
        Assert.Throws<ArgumentNullException>(() => new WebPushDeliveryGateway(null!));
        Assert.Throws<ArgumentNullException>(() => new WebPushDeliveryGateway(Options.Create(new WebPushOptions()), null!));
    }

    [Fact]
    public void Get_client_configuration_reports_when_delivery_is_disabled()
    {
        var gateway = CreateGateway(new WebPushOptions(), new StubWebPushClientAdapter());

        var configuration = gateway.GetClientConfiguration();

        Assert.False(configuration.Enabled);
        Assert.Equal(string.Empty, configuration.PublicKey);
    }

    [Fact]
    public void Get_client_configuration_reports_when_delivery_is_enabled()
    {
        var gateway = CreateGateway(new WebPushOptions
        {
            PublicKey = "public-key",
            PrivateKey = "private-key",
            Subject = "mailto:test@example.com",
        }, new StubWebPushClientAdapter());

        var configuration = gateway.GetClientConfiguration();

        Assert.True(configuration.Enabled);
        Assert.Equal("public-key", configuration.PublicKey);
    }

    [Fact]
    public async Task Send_async_rejects_null_arguments_and_unconfigured_delivery()
    {
        var gateway = CreateGateway(new WebPushOptions(), new StubWebPushClientAdapter());
        var payload = new PushNotificationPayload("Title", "Body", "/dashboard", "test-tag");
        var subscription = new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", null);

        await Assert.ThrowsAsync<ArgumentNullException>(() => gateway.SendAsync(null!, payload, CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentNullException>(() => gateway.SendAsync(subscription, null!, CancellationToken.None));

        var exception = await Assert.ThrowsAsync<PushDeliveryFailedException>(() =>
            gateway.SendAsync(subscription, payload, CancellationToken.None));

        Assert.False(exception.DeleteSubscription);
        Assert.Equal("Web push delivery is not configured.", exception.Message);
    }

    [Fact]
    public async Task Send_async_forwards_the_subscription_payload_and_vapid_details()
    {
        var client = new StubWebPushClientAdapter();
        var gateway = CreateGateway(new WebPushOptions
        {
            PublicKey = "public-key",
            PrivateKey = "private-key",
            Subject = "mailto:test@example.com",
        }, client);
        var subscription = new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", null);
        var payload = new PushNotificationPayload("Title", "Body", "/gara", "test-tag");

        await gateway.SendAsync(subscription, payload, CancellationToken.None);

        Assert.NotNull(client.Subscription);
        Assert.Equal("https://example.com/push", client.Subscription!.Endpoint);
        Assert.Equal("p256dh", client.Subscription.P256DH);
        Assert.Equal("auth", client.Subscription.Auth);
        Assert.NotNull(client.VapidDetails);
        Assert.Equal("mailto:test@example.com", client.VapidDetails!.Subject);
        Assert.Equal("public-key", client.VapidDetails.PublicKey);
        Assert.Equal("private-key", client.VapidDetails.PrivateKey);
        Assert.Contains("\"Title\":\"Title\"", client.Payload);
        Assert.Contains("\"Url\":\"/gara\"", client.Payload);
    }

    [Theory]
    [InlineData(HttpStatusCode.Gone, true)]
    [InlineData(HttpStatusCode.NotFound, true)]
    [InlineData(HttpStatusCode.BadGateway, false)]
    public async Task Send_async_maps_web_push_failures_to_domain_failures(HttpStatusCode statusCode, bool deleteSubscription)
    {
        var client = new StubWebPushClientAdapter
        {
            ExceptionToThrow = new WebPushException(
                "delivery failed",
                statusCode,
                headers: null,
                pushSubscription: new PushSubscription("https://example.com/push", "p256dh", "auth")),
        };
        var gateway = CreateGateway(new WebPushOptions
        {
            PublicKey = "public-key",
            PrivateKey = "private-key",
            Subject = "mailto:test@example.com",
        }, client);

        var exception = await Assert.ThrowsAsync<PushDeliveryFailedException>(() => gateway.SendAsync(
            new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", null),
            new PushNotificationPayload("Title", "Body", "/dashboard", "test-tag"),
            CancellationToken.None));

        Assert.Equal("delivery failed", exception.Message);
        Assert.Equal(deleteSubscription, exception.DeleteSubscription);
    }

    private static WebPushDeliveryGateway CreateGateway(WebPushOptions options, IWebPushClientAdapter client)
    {
        return new WebPushDeliveryGateway(Options.Create(options), client);
    }

    private sealed class StubWebPushClientAdapter : IWebPushClientAdapter
    {
        public Exception? ExceptionToThrow { get; set; }
        public string Payload { get; private set; } = string.Empty;
        public PushSubscription? Subscription { get; private set; }
        public VapidDetails? VapidDetails { get; private set; }

        public Task SendNotificationAsync(
            PushSubscription subscription,
            string payload,
            VapidDetails vapidDetails,
            CancellationToken cancellationToken)
        {
            if (ExceptionToThrow is not null)
            {
                throw ExceptionToThrow;
            }

            Subscription = subscription;
            Payload = payload;
            VapidDetails = vapidDetails;
            return Task.CompletedTask;
        }
    }

    private sealed class NullWebPushOptions : IOptions<WebPushOptions>
    {
        public WebPushOptions Value => null!;
    }
}
