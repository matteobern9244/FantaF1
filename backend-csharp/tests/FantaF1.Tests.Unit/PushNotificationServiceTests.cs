using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Tests.Unit;

public sealed class PushNotificationServiceTests
{
    [Fact]
    public void Constructor_rejects_null_dependencies()
    {
        Assert.Throws<ArgumentNullException>(() => new PushNotificationService(null!, new StubPushDeliveryGateway()));
        Assert.Throws<ArgumentNullException>(() => new PushNotificationService(new StubPushSubscriptionRepository(), null!));
    }

    [Fact]
    public void Get_client_configuration_returns_the_gateway_configuration()
    {
        var service = new PushNotificationService(
            new StubPushSubscriptionRepository(),
            new StubPushDeliveryGateway
            {
                Configuration = new PushNotificationClientConfiguration(true, "public-key"),
            });

        var configuration = service.GetClientConfiguration();

        Assert.True(configuration.Enabled);
        Assert.Equal("public-key", configuration.PublicKey);
    }

    [Fact]
    public async Task Send_test_notification_async_dispatches_the_stored_subscription()
    {
        var repository = new StubPushSubscriptionRepository
        {
            StoredSubscription = new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", 123.45),
        };
        var gateway = new StubPushDeliveryGateway();
        var service = new PushNotificationService(repository, gateway);

        await service.SendTestNotificationAsync("  https://example.com/push  ", CancellationToken.None);

        Assert.NotNull(gateway.DeliveredSubscription);
        Assert.Equal("https://example.com/push", gateway.DeliveredSubscription!.Endpoint);
        Assert.NotNull(gateway.DeliveredPayload);
        Assert.Equal(PushNotificationsContract.TestNotificationTitle, gateway.DeliveredPayload!.Title);
    }

    [Fact]
    public async Task Send_test_notification_async_rejects_missing_endpoints()
    {
        var service = new PushNotificationService(new StubPushSubscriptionRepository(), new StubPushDeliveryGateway());

        await Assert.ThrowsAsync<ArgumentException>(() => service.SendTestNotificationAsync("   ", CancellationToken.None));
    }

    [Fact]
    public async Task Send_test_notification_async_throws_when_the_subscription_does_not_exist()
    {
        var service = new PushNotificationService(new StubPushSubscriptionRepository(), new StubPushDeliveryGateway());

        var exception = await Assert.ThrowsAsync<PushSubscriptionNotFoundException>(() => service.SendTestNotificationAsync(
            "https://example.com/missing",
            CancellationToken.None));

        Assert.Equal("https://example.com/missing", exception.Endpoint);
    }

    [Fact]
    public async Task Send_test_notification_async_deletes_invalid_subscriptions_after_a_delivery_failure()
    {
        var repository = new StubPushSubscriptionRepository
        {
            StoredSubscription = new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", 123.45),
        };
        var service = new PushNotificationService(
            repository,
            new StubPushDeliveryGateway
            {
                ExceptionToThrow = new PushDeliveryFailedException("expired", deleteSubscription: true),
            });

        await Assert.ThrowsAsync<PushDeliveryFailedException>(() => service.SendTestNotificationAsync(
            "https://example.com/push",
            CancellationToken.None));

        Assert.Equal("https://example.com/push", repository.DeletedEndpoint);
    }

    [Fact]
    public async Task Send_test_notification_async_preserves_the_subscription_when_delivery_failure_is_not_terminal()
    {
        var repository = new StubPushSubscriptionRepository
        {
            StoredSubscription = new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", 123.45),
        };
        var service = new PushNotificationService(
            repository,
            new StubPushDeliveryGateway
            {
                ExceptionToThrow = new PushDeliveryFailedException("temporary", deleteSubscription: false),
            });

        await Assert.ThrowsAsync<PushDeliveryFailedException>(() => service.SendTestNotificationAsync(
            "https://example.com/push",
            CancellationToken.None));

        Assert.Null(repository.DeletedEndpoint);
    }

    private sealed class StubPushSubscriptionRepository : IPushSubscriptionRepository
    {
        public string? DeletedEndpoint { get; private set; }
        public PushSubscriptionDocument? StoredSubscription { get; set; }

        public Task AddAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task DeleteAsync(string endpoint, CancellationToken cancellationToken)
        {
            DeletedEndpoint = endpoint;
            return Task.CompletedTask;
        }
        public Task<IReadOnlyList<PushSubscriptionDocument>> GetAllAsync(CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<PushSubscriptionDocument>>([]);
        public Task<PushSubscriptionDocument?> GetByIdAsync(string endpoint, CancellationToken cancellationToken) => Task.FromResult(StoredSubscription);
        public Task UpdateAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task UpsertAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class StubPushDeliveryGateway : IPushDeliveryGateway
    {
        public PushNotificationClientConfiguration Configuration { get; set; } = new(true, "public-key");
        public PushSubscriptionDocument? DeliveredSubscription { get; private set; }
        public PushNotificationPayload? DeliveredPayload { get; private set; }
        public Exception? ExceptionToThrow { get; set; }

        public PushNotificationClientConfiguration GetClientConfiguration() => Configuration;

        public Task SendAsync(
            PushSubscriptionDocument subscription,
            PushNotificationPayload payload,
            CancellationToken cancellationToken)
        {
            if (ExceptionToThrow is not null)
            {
                throw ExceptionToThrow;
            }

            DeliveredSubscription = subscription;
            DeliveredPayload = payload;
            return Task.CompletedTask;
        }
    }
}
