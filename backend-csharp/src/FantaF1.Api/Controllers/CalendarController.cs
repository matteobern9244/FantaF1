using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/calendar")]
public sealed class CalendarController : ControllerBase
{
    private readonly ICalendarReadService _calendarReadService;

    public CalendarController(ICalendarReadService calendarReadService)
    {
        _calendarReadService = calendarReadService ?? throw new ArgumentNullException(nameof(calendarReadService));
    }

    [HttpGet]
    public async Task<IActionResult> GetCalendar(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _calendarReadService.ReadAllAsync(cancellationToken));
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                error = ReadRouteContract.ReadCalendarFailed,
            });
        }
    }
}
