using FantaF1.Application.Abstractions.Services;
using Microsoft.Extensions.DependencyInjection;

namespace FantaF1.Application.DependencyInjection;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddFantaF1Application(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IAdminSessionService, PlaceholderAdminSessionService>();
        services.AddScoped<IBackgroundSyncService, PlaceholderBackgroundSyncService>();
        services.AddScoped<IResultsService, PlaceholderResultsService>();
        services.AddScoped<ISaveRequestService, PlaceholderSaveRequestService>();

        return services;
    }

    private sealed class PlaceholderAdminSessionService : IAdminSessionService;

    private sealed class PlaceholderBackgroundSyncService : IBackgroundSyncService;

    private sealed class PlaceholderResultsService : IResultsService;

    private sealed class PlaceholderSaveRequestService : ISaveRequestService;
}
