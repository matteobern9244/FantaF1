using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("")]
public sealed class PortingBootstrapController : ControllerBase
{
    public const string ReadyMessage = "FantaF1 backend-csharp bootstrap ready";

    [HttpGet]
    public IActionResult GetReadyMessage()
    {
        return new ContentResult
        {
            Content = ReadyMessage,
            ContentType = "text/plain",
            StatusCode = StatusCodes.Status200OK,
        };
    }

    public static IEndpointRouteBuilder ValidateRouteBuilder(IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);
        return endpoints;
    }
}
