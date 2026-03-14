using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/drivers")]
public sealed class DriversController : ControllerBase
{
    private readonly IDriverReadService _driverReadService;

    public DriversController(IDriverReadService driverReadService)
    {
        _driverReadService = driverReadService ?? throw new ArgumentNullException(nameof(driverReadService));
    }

    [HttpGet]
    public async Task<IActionResult> GetDrivers(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _driverReadService.ReadAllAsync(cancellationToken));
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                error = ReadRouteContract.ReadDriversFailed,
            });
        }
    }
}
