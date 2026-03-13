using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/standings")]
public sealed class StandingsController : ControllerBase
{
    private readonly IStandingsReadService _standingsReadService;

    public StandingsController(IStandingsReadService standingsReadService)
    {
        _standingsReadService = standingsReadService ?? throw new ArgumentNullException(nameof(standingsReadService));
    }

    [HttpGet]
    public async Task<IActionResult> GetStandings(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _standingsReadService.ReadAsync(cancellationToken));
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                error = ReadRouteContract.ReadStandingsFailed,
            });
        }
    }
}
