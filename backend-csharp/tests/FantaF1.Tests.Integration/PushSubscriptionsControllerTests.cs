using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Tests.Integration;

public sealed class PushSubscriptionsControllerTests
{
    [Fact]
    public void Push_subscriptions_controller_rejects_null_services()
    {
        Assert.Throws<ArgumentNullException>(() => new PushSubscriptionsController(null!));
    }

    [Fact]
    public async Task Post_push_subscription_maps_the_browser_payload_and_returns_no_content()
    {
        var subscriptions = new StubPushSubscriptionService();
        var controller = new PushSubscriptionsController(subscriptions);

        var result = await controller.UpsertSubscription(
            new PushSubscriptionUpsertRequest(
                "https://example.com/push",
                123.45,
                "p256dh",
                "auth",
                null),
            CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.NotNull(subscriptions.UpsertedSubscription);
        Assert.Equal("https://example.com/push", subscriptions.UpsertedSubscription!.Endpoint);
        Assert.Equal("p256dh", subscriptions.UpsertedSubscription.P256dh);
        Assert.Equal("auth", subscriptions.UpsertedSubscription.Auth);
    }

    [Fact]
    public async Task Post_push_subscription_reads_nested_browser_keys_when_flat_fields_are_missing()
    {
        var subscriptions = new StubPushSubscriptionService();
        var controller = new PushSubscriptionsController(subscriptions);

        var result = await controller.UpsertSubscription(
            new PushSubscriptionUpsertRequest(
                "https://example.com/push",
                null,
                null,
                null,
                new PushSubscriptionKeysRequest("nested-p256dh", "nested-auth")),
            CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.NotNull(subscriptions.UpsertedSubscription);
        Assert.Equal("nested-p256dh", subscriptions.UpsertedSubscription!.P256dh);
        Assert.Equal("nested-auth", subscriptions.UpsertedSubscription.Auth);
    }

    [Fact]
    public async Task Post_push_subscription_allows_missing_browser_keys_when_the_endpoint_is_present()
    {
        var subscriptions = new StubPushSubscriptionService();
        var controller = new PushSubscriptionsController(subscriptions);

        var result = await controller.UpsertSubscription(
            new PushSubscriptionUpsertRequest(
                "https://example.com/push",
                null,
                null,
                null,
                null),
            CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.NotNull(subscriptions.UpsertedSubscription);
        Assert.Null(subscriptions.UpsertedSubscription!.P256dh);
        Assert.Null(subscriptions.UpsertedSubscription.Auth);
    }

    [Fact]
    public async Task Post_push_subscription_rejects_missing_endpoint()
    {
        var controller = new PushSubscriptionsController(new StubPushSubscriptionService());

        var result = await controller.UpsertSubscription(
            new PushSubscriptionUpsertRequest(null, null, "p256dh", "auth", null),
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(PushSubscriptionsContract.BadRequestStatusCode, badRequest.StatusCode);
    }

    [Fact]
    public async Task Post_push_subscription_rejects_a_whitespace_endpoint()
    {
        var controller = new PushSubscriptionsController(new StubPushSubscriptionService());

        var result = await controller.UpsertSubscription(
            new PushSubscriptionUpsertRequest("   ", null, "p256dh", "auth", null),
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(PushSubscriptionsContract.BadRequestStatusCode, badRequest.StatusCode);
    }

    [Fact]
    public async Task Post_push_subscription_rejects_a_null_request_body()
    {
        var controller = new PushSubscriptionsController(new StubPushSubscriptionService());

        var result = await controller.UpsertSubscription(null, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(PushSubscriptionsContract.BadRequestStatusCode, badRequest.StatusCode);
    }

    [Fact]
    public async Task Post_push_subscription_returns_internal_server_error_when_storage_write_fails()
    {
        var controller = new PushSubscriptionsController(new ThrowingPushSubscriptionService());

        var result = await controller.UpsertSubscription(
            new PushSubscriptionUpsertRequest(
                "https://example.com/push",
                123.45,
                "p256dh",
                "auth",
                null),
            CancellationToken.None);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(PushSubscriptionsContract.InternalServerErrorStatusCode, error.StatusCode);
        Assert.Equal(PushSubscriptionsContract.StorageWriteFailedCode, error.Value!.GetType().GetProperty("code")!.GetValue(error.Value));
    }

    [Fact]
    public async Task Delete_push_subscription_requires_endpoint()
    {
        var controller = new PushSubscriptionsController(new StubPushSubscriptionService());

        var result = await controller.DeleteSubscription(
            null,
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(PushSubscriptionsContract.BadRequestStatusCode, badRequest.StatusCode);
    }

    [Fact]
    public async Task Delete_push_subscription_rejects_a_whitespace_endpoint()
    {
        var controller = new PushSubscriptionsController(new StubPushSubscriptionService());

        var result = await controller.DeleteSubscription("   ", CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(PushSubscriptionsContract.BadRequestStatusCode, badRequest.StatusCode);
    }

    [Fact]
    public async Task Delete_push_subscription_returns_no_content()
    {
        var subscriptions = new StubPushSubscriptionService();
        var controller = new PushSubscriptionsController(subscriptions);

        var result = await controller.DeleteSubscription("https://example.com/push", CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("https://example.com/push", subscriptions.DeletedEndpoint);
    }

    [Fact]
    public async Task Delete_push_subscription_returns_internal_server_error_when_storage_delete_fails()
    {
        var controller = new PushSubscriptionsController(new ThrowingPushSubscriptionService());

        var result = await controller.DeleteSubscription("https://example.com/push", CancellationToken.None);

        var error = Assert.IsType<ObjectResult>(result);
        Assert.Equal(PushSubscriptionsContract.InternalServerErrorStatusCode, error.StatusCode);
        Assert.Equal(PushSubscriptionsContract.StorageDeleteFailedCode, error.Value!.GetType().GetProperty("code")!.GetValue(error.Value));
    }

    private sealed class StubPushSubscriptionService : IPushSubscriptionService
    {
        public PushSubscriptionDocument? UpsertedSubscription { get; private set; }
        public string? DeletedEndpoint { get; private set; }

        public Task SubscribeAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken)
        {
            UpsertedSubscription = subscription;
            return Task.CompletedTask;
        }

        public Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken)
        {
            DeletedEndpoint = endpoint;
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingPushSubscriptionService : IPushSubscriptionService
    {
        public Task SubscribeAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("storage write failed");
        }

        public Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("storage delete failed");
        }
    }
}
