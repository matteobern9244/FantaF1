using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.Results;
using FantaF1.Domain.SaveValidation;
using FantaF1.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace FantaF1.Application.DependencyInjection;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddFantaF1Application(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddSingleton<AppDataSanitizer>();
        services.AddSingleton<CalendarOrderingService>();
        services.AddSingleton<DriverOrderingService>();
        services.AddSingleton<FormulaOneResultsUrlBuilder>();
        services.AddSingleton<ParticipantRosterValidator>();
        services.AddSingleton<OfficialResultsParser>();
        services.AddSingleton<PredictionCompletenessValidator>();
        services.AddSingleton<RacePhaseResolver>();
        services.AddSingleton<RaceResultsCache>();
        services.AddSingleton<RaceLockValidator>();
        services.AddScoped<AdminSessionCookieInspector>();
        services.AddScoped<IAdminSessionService, AdminSessionService>();
        services.AddScoped<IAppDataReadService, AppDataReadService>();
        services.AddScoped<IBackgroundSyncService, PlaceholderBackgroundSyncService>();
        services.AddScoped<ICalendarReadService, CalendarReadService>();
        services.AddScoped<IDriverReadService, DriverReadService>();
        services.AddScoped<IHealthReportService, HealthReportService>();
        services.AddScoped<IResultsService, ResultsService>();
        services.AddScoped<ISaveRequestService, SaveRequestService>();
        services.AddScoped<IStandingsReadService, StandingsReadService>();
        services.AddScoped<IStandingsSyncService, StandingsSyncService>();

        return services;
    }

    private sealed class PlaceholderBackgroundSyncService : IBackgroundSyncService;
}
