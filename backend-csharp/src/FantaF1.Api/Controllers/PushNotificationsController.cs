using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/push-notifications")]
public sealed class PushNotificationsController : ControllerBase
{
    private readonly IPushNotificationService _pushNotificationService;

    public PushNotificationsController(IPushNotificationService pushNotificationService)
    {
        _pushNotificationService = pushNotificationService
            ?? throw new ArgumentNullException(nameof(pushNotificationService));
    }

    [HttpGet("config")]
    public ActionResult<PushNotificationClientConfiguration> GetClientConfiguration()
    {
        return Ok(_pushNotificationService.GetClientConfiguration());
    }

    [HttpPost("test-delivery")]
    public async Task<IActionResult> SendTestDeliveryAsync(
        [FromBody] PushTestDeliveryRequest? requestBody,
        CancellationToken cancellationToken)
    {
        if (requestBody is null || string.IsNullOrWhiteSpace(requestBody.Endpoint))
        {
            return BadRequest(new
            {
                error = PushNotificationsContract.EndpointMissingError,
                code = PushNotificationsContract.EndpointMissingCode,
            });
        }

        try
        {
            await _pushNotificationService.SendTestNotificationAsync(requestBody.Endpoint, cancellationToken);
            return NoContent();
        }
        catch (PushSubscriptionNotFoundException exception)
        {
            return NotFound(new
            {
                error = PushNotificationsContract.SubscriptionNotFoundError,
                code = PushNotificationsContract.SubscriptionNotFoundCode,
                details = exception.Message,
            });
        }
        catch (PushDeliveryFailedException exception)
        {
            return StatusCode(PushNotificationsContract.DeliveryFailedStatusCode, new
            {
                error = PushNotificationsContract.DeliveryFailedError,
                code = PushNotificationsContract.DeliveryFailedCode,
                details = exception.Message,
            });
        }
    }
}
