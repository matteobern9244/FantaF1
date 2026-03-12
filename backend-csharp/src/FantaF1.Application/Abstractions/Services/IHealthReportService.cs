namespace FantaF1.Application.Abstractions.Services;

public interface IHealthReportService
{
    HealthReport GetCurrentReport();
}

public sealed record HealthReport(
    string Status,
    int Year,
    int DbState,
    string Environment,
    string DatabaseTarget);
