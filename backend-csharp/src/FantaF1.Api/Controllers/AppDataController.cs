using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/data")]
public sealed class AppDataController : ControllerBase
{
    private readonly IAppDataReadService _appDataReadService;

    public AppDataController(IAppDataReadService appDataReadService)
    {
        _appDataReadService = appDataReadService ?? throw new ArgumentNullException(nameof(appDataReadService));
    }

    [HttpGet]
    public async Task<IActionResult> GetData(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _appDataReadService.ReadAsync(cancellationToken));
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                error = ReadRouteContract.ReadAppDataFailed,
            });
        }
    }
}
