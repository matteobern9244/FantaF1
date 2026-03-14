using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;

namespace FantaF1.Application.Services;

public sealed class HealthReportService : IHealthReportService
{
    private readonly IClock _clock;
    private readonly IRuntimeEnvironmentProfileResolver _runtimeEnvironmentProfileResolver;

    public HealthReportService(
        IClock clock,
        IRuntimeEnvironmentProfileResolver runtimeEnvironmentProfileResolver)
    {
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _runtimeEnvironmentProfileResolver = runtimeEnvironmentProfileResolver
            ?? throw new ArgumentNullException(nameof(runtimeEnvironmentProfileResolver));
    }

    public HealthReport GetCurrentReport()
    {
        var profile = _runtimeEnvironmentProfileResolver.ResolveCurrentProfile();

        return new HealthReport(
            HealthReportContract.OkStatus,
            _clock.UtcNow.Year,
            HealthReportContract.PlaceholderConnectedDbState,
            profile.Environment,
            profile.DatabaseTarget);
    }
}
