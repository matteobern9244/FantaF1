using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Tests.Unit;

public sealed class PushSubscriptionServiceTests
{
    [Fact]
    public void Constructor_rejects_a_null_repository()
    {
        Assert.Throws<ArgumentNullException>(() => new PushSubscriptionService(null!));
    }

    [Fact]
    public async Task Subscribe_async_normalizes_the_endpoint_and_upserts_the_subscription()
    {
        var repository = new StubPushSubscriptionRepository();
        var service = new PushSubscriptionService(repository);
        var subscription = new PushSubscriptionDocument(
            "  https://example.com/push  ",
            "p256dh",
            "auth",
            123.45);

        await service.SubscribeAsync(subscription, CancellationToken.None);

        Assert.NotNull(repository.UpsertedSubscription);
        Assert.Equal("https://example.com/push", repository.UpsertedSubscription!.Endpoint);
        Assert.Equal("p256dh", repository.UpsertedSubscription.P256dh);
        Assert.Equal("auth", repository.UpsertedSubscription.Auth);
        Assert.Equal(123.45, repository.UpsertedSubscription.ExpirationTime);
    }

    [Fact]
    public async Task Subscribe_async_rejects_a_null_subscription()
    {
        var service = new PushSubscriptionService(new StubPushSubscriptionRepository());

        var exception = await Assert.ThrowsAsync<ArgumentNullException>(() => service.SubscribeAsync(
            null!,
            CancellationToken.None));

        Assert.Equal("subscription", exception.ParamName);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Subscribe_async_rejects_a_missing_endpoint(string endpoint)
    {
        var service = new PushSubscriptionService(new StubPushSubscriptionRepository());

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.SubscribeAsync(
            new PushSubscriptionDocument(endpoint, "p256dh", "auth", null),
            CancellationToken.None));

        Assert.Equal("subscription", exception.ParamName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Unsubscribe_async_rejects_a_missing_endpoint(string? endpoint)
    {
        var service = new PushSubscriptionService(new StubPushSubscriptionRepository());

        if (endpoint is null)
        {
            var nullException = await Assert.ThrowsAsync<ArgumentNullException>(() => service.UnsubscribeAsync(endpoint!, CancellationToken.None));
            Assert.Equal("endpoint", nullException.ParamName);
            return;
        }

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UnsubscribeAsync(endpoint, CancellationToken.None));

        Assert.Equal("endpoint", exception.ParamName);
    }

    [Fact]
    public async Task Unsubscribe_async_trims_the_endpoint_before_deleting()
    {
        var repository = new StubPushSubscriptionRepository();
        var service = new PushSubscriptionService(repository);

        await service.UnsubscribeAsync("  https://example.com/push  ", CancellationToken.None);

        Assert.Equal("https://example.com/push", repository.DeletedEndpoint);
    }

    private sealed class StubPushSubscriptionRepository : IPushSubscriptionRepository
    {
        public PushSubscriptionDocument? UpsertedSubscription { get; private set; }
        public string? DeletedEndpoint { get; private set; }

        public Task<PushSubscriptionDocument?> GetByIdAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<IReadOnlyList<PushSubscriptionDocument>> GetAllAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddAsync(PushSubscriptionDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task UpdateAsync(PushSubscriptionDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();

        public Task DeleteAsync(string endpoint, CancellationToken cancellationToken)
        {
            DeletedEndpoint = endpoint;
            return Task.CompletedTask;
        }

        public Task UpsertAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken)
        {
            UpsertedSubscription = subscription;
            return Task.CompletedTask;
        }
    }
}
