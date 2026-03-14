using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/data")]
public sealed class AppDataController : ControllerBase
{
    private readonly IAppDataReadService _appDataReadService;
    private readonly ISaveRequestService _saveRequestService;

    public AppDataController(IAppDataReadService appDataReadService, ISaveRequestService saveRequestService)
    {
        _appDataReadService = appDataReadService ?? throw new ArgumentNullException(nameof(appDataReadService));
        _saveRequestService = saveRequestService ?? throw new ArgumentNullException(nameof(saveRequestService));
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

    [HttpPost]
    public async Task<IActionResult> SaveData(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AppDataDocument? requestBody,
        CancellationToken cancellationToken)
    {
        var outcome = await _saveRequestService.SaveDataAsync(
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
