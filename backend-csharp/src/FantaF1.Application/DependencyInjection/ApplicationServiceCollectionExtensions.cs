using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
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
        services.AddScoped<IAdminSessionService, AdminSessionService>();
        services.AddScoped<IAppDataReadService, AppDataReadService>();
        services.AddScoped<IBackgroundSyncService, PlaceholderBackgroundSyncService>();
        services.AddScoped<ICalendarReadService, CalendarReadService>();
        services.AddScoped<IDriverReadService, DriverReadService>();
        services.AddScoped<IHealthReportService, HealthReportService>();
        services.AddScoped<IResultsService, PlaceholderResultsService>();
        services.AddScoped<ISaveRequestService, PlaceholderSaveRequestService>();

        return services;
    }

    private sealed class PlaceholderBackgroundSyncService : IBackgroundSyncService;

    private sealed class PlaceholderResultsService : IResultsService;

    private sealed class PlaceholderSaveRequestService : ISaveRequestService;
}
