using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/predictions")]
public sealed class PredictionsController : ControllerBase
{
    private readonly ISaveRequestService _saveRequestService;

    public PredictionsController(ISaveRequestService saveRequestService)
    {
        _saveRequestService = saveRequestService ?? throw new ArgumentNullException(nameof(saveRequestService));
    }

    [HttpPost]
    public async Task<IActionResult> SavePredictions(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AppDataDocument? requestBody,
        CancellationToken cancellationToken)
    {
        var outcome = await _saveRequestService.SavePredictionsAsync(
            requestBody,
            Request.Headers.Cookie.ToString(),
            cancellationToken);

        return outcome switch
        {
            SaveSuccessOutcome successOutcome => Ok(successOutcome.Payload),
            SaveErrorOutcome errorOutcome => StatusCode(errorOutcome.StatusCode, errorOutcome.Payload),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
