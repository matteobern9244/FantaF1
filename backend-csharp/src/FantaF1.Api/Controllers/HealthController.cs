using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Mvc;

namespace FantaF1.Api.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    private readonly IHealthReportService _healthReportService;

    public HealthController(IHealthReportService healthReportService)
    {
        _healthReportService = healthReportService ?? throw new ArgumentNullException(nameof(healthReportService));
    }

    [HttpGet]
    public ActionResult<HealthReport> GetHealth()
    {
        return Ok(_healthReportService.GetCurrentReport());
    }
}
