using System.Text.Json;
using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class SessionController : ControllerBase
{
    private readonly IAdminSessionService _adminSessionService;

    public SessionController(IAdminSessionService adminSessionService)
    {
        _adminSessionService = adminSessionService ?? throw new ArgumentNullException(nameof(adminSessionService));
    }

    [HttpGet("session")]
    public async Task<ActionResult<AdminSessionResponse>> GetSession(CancellationToken cancellationToken)
    {
        return Ok(await _adminSessionService.GetSessionAsync(Request.Headers.Cookie.ToString(), cancellationToken));
    }

    [HttpPost("admin/session")]
    public async Task<IActionResult> CreateAdminSession(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement? requestBody,
        CancellationToken cancellationToken)
    {
        var password = TryReadPassword(requestBody);
        var result = await _adminSessionService.LoginAsync(password, cancellationToken);

        if (!result.IsAuthenticated)
        {
            return Unauthorized(new
            {
                error = AdminSessionContract.InvalidPasswordError,
                code = AdminSessionContract.InvalidPasswordCode,
            });
        }

        Response.Headers["Set-Cookie"] = result.SetCookieHeaderValue;
        return Ok(result.Response);
    }

    [HttpDelete("admin/session")]
    public ActionResult<AdminSessionResponse> DeleteAdminSession()
    {
        var result = _adminSessionService.Logout();
        Response.Headers["Set-Cookie"] = result.SetCookieHeaderValue;
        return Ok(result.Response);
    }

    private static string? TryReadPassword(JsonElement? requestBody)
    {
        return requestBody is JsonElement body
            && body.ValueKind == JsonValueKind.Object
            && body.TryGetProperty("password", out var passwordProperty)
            && passwordProperty.ValueKind == JsonValueKind.String
                ? passwordProperty.GetString()
                : null;
    }
}
