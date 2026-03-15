using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/results")]
public sealed class ResultsController : ControllerBase
{
    private readonly IResultsService _resultsService;

    public ResultsController(IResultsService resultsService)
    {
        _resultsService = resultsService ?? throw new ArgumentNullException(nameof(resultsService));
    }

    [HttpGet("{meetingKey}")]
    public async Task<IActionResult> GetResults(string meetingKey, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _resultsService.ReadAsync(meetingKey, cancellationToken));
        }
        catch (Exception exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                error = ReadRouteContract.FetchResultsFailed,
                details = exception.Message,
            });
        }
    }
}
