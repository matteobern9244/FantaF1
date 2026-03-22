using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/push-subscriptions")]
public sealed class PushSubscriptionsController : ControllerBase
{
    private readonly IPushSubscriptionService _pushSubscriptionService;

    public PushSubscriptionsController(IPushSubscriptionService pushSubscriptionService)
    {
        _pushSubscriptionService = pushSubscriptionService
            ?? throw new ArgumentNullException(nameof(pushSubscriptionService));
    }

    [HttpPost]
    public async Task<IActionResult> UpsertSubscription(
        [FromBody] PushSubscriptionUpsertRequest? requestBody,
        CancellationToken cancellationToken)
    {
        var subscription = MapRequest(requestBody);
        if (subscription is null)
        {
            return BadRequest(new
            {
                error = PushSubscriptionsContract.InvalidSubscriptionError,
                code = PushSubscriptionsContract.InvalidSubscriptionCode,
            });
        }

        try
        {
            await _pushSubscriptionService.SubscribeAsync(subscription, cancellationToken);
            return NoContent();
        }
        catch (Exception exception)
        {
            return StatusCode(PushSubscriptionsContract.InternalServerErrorStatusCode, new
            {
                error = PushSubscriptionsContract.StorageWriteFailedError,
                code = PushSubscriptionsContract.StorageWriteFailedCode,
                details = exception.Message,
            });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteSubscription(
        [FromQuery] string? endpoint,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return BadRequest(new
            {
                error = PushSubscriptionsContract.EndpointMissingError,
                code = PushSubscriptionsContract.EndpointMissingCode,
            });
        }

        try
        {
            await _pushSubscriptionService.UnsubscribeAsync(endpoint, cancellationToken);
            return NoContent();
        }
        catch (Exception exception)
        {
            return StatusCode(PushSubscriptionsContract.InternalServerErrorStatusCode, new
            {
                error = PushSubscriptionsContract.StorageDeleteFailedError,
                code = PushSubscriptionsContract.StorageDeleteFailedCode,
                details = exception.Message,
            });
        }
    }

    private static PushSubscriptionDocument? MapRequest(PushSubscriptionUpsertRequest? requestBody)
    {
        if (requestBody is null || string.IsNullOrWhiteSpace(requestBody.Endpoint))
        {
            return null;
        }

        return new PushSubscriptionDocument(
            requestBody.Endpoint,
            requestBody.P256dh ?? requestBody.Keys?.P256dh,
            requestBody.Auth ?? requestBody.Keys?.Auth,
            requestBody.ExpirationTime);
    }
}
