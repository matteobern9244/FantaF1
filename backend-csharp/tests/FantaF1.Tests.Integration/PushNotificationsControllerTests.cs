using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Tests.Integration;

public sealed class PushNotificationsControllerTests
{
    [Fact]
    public void Constructor_rejects_a_null_service()
    {
        Assert.Throws<ArgumentNullException>(() => new PushNotificationsController(null!));
    }

    [Fact]
    public void Get_config_returns_the_client_configuration()
    {
        var controller = new PushNotificationsController(new StubPushNotificationService());

        var result = controller.GetClientConfiguration();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PushNotificationClientConfiguration>(ok.Value);
        Assert.True(payload.Enabled);
        Assert.Equal("public-key", payload.PublicKey);
    }

    [Fact]
    public async Task Post_test_delivery_returns_no_content_when_the_endpoint_is_valid()
    {
        var service = new StubPushNotificationService();
        var controller = new PushNotificationsController(service);

        var result = await controller.SendTestDeliveryAsync(
            new PushTestDeliveryRequest("https://example.com/push"),
            CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("https://example.com/push", service.DeliveredEndpoint);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Post_test_delivery_returns_bad_request_when_the_endpoint_is_missing(string? endpoint)
    {
        var controller = new PushNotificationsController(new StubPushNotificationService());

        var result = await controller.SendTestDeliveryAsync(
            endpoint is null ? null : new PushTestDeliveryRequest(endpoint),
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(PushNotificationsContract.BadRequestStatusCode, badRequest.StatusCode);
    }

    [Fact]
    public async Task Post_test_delivery_returns_not_found_when_the_subscription_is_missing()
    {
        var controller = new PushNotificationsController(new MissingSubscriptionPushNotificationService());

        var result = await controller.SendTestDeliveryAsync(
            new PushTestDeliveryRequest("https://example.com/push"),
            CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(PushNotificationsContract.SubscriptionNotFoundCode, notFound.Value!.GetType().GetProperty("code")!.GetValue(notFound.Value));
    }

    [Fact]
    public async Task Post_test_delivery_returns_bad_gateway_when_delivery_fails()
    {
        var controller = new PushNotificationsController(new FailingPushNotificationService());

        var result = await controller.SendTestDeliveryAsync(
            new PushTestDeliveryRequest("https://example.com/push"),
            CancellationToken.None);

        var badGateway = Assert.IsType<ObjectResult>(result);
        Assert.Equal(PushNotificationsContract.DeliveryFailedStatusCode, badGateway.StatusCode);
    }

    private sealed class StubPushNotificationService : IPushNotificationService
    {
        public string? DeliveredEndpoint { get; private set; }

        public PushNotificationClientConfiguration GetClientConfiguration() => new(true, "public-key");

        public Task SendTestNotificationAsync(string endpoint, CancellationToken cancellationToken)
        {
            DeliveredEndpoint = endpoint;
            return Task.CompletedTask;
        }
    }

    private sealed class MissingSubscriptionPushNotificationService : IPushNotificationService
    {
        public PushNotificationClientConfiguration GetClientConfiguration() => new(true, "public-key");

        public Task SendTestNotificationAsync(string endpoint, CancellationToken cancellationToken)
        {
            throw new PushSubscriptionNotFoundException(endpoint);
        }
    }

    private sealed class FailingPushNotificationService : IPushNotificationService
    {
        public PushNotificationClientConfiguration GetClientConfiguration() => new(true, "public-key");

        public Task SendTestNotificationAsync(string endpoint, CancellationToken cancellationToken)
        {
            throw new PushDeliveryFailedException("delivery failed", deleteSubscription: false);
        }
    }
}
