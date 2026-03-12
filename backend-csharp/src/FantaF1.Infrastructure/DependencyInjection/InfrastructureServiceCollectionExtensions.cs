using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.System;
using Microsoft.Extensions.DependencyInjection;

namespace FantaF1.Infrastructure.DependencyInjection;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddFantaF1Infrastructure(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IAdminCredentialRepository, PlaceholderAdminCredentialRepository>();
        services.AddScoped<IAppDataRepository, PlaceholderAppDataRepository>();
        services.AddScoped<IDriverRepository, PlaceholderDriverRepository>();
        services.AddScoped<IWeekendRepository, PlaceholderWeekendRepository>();
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<ISignedCookieService, DeferredSignedCookieService>();

        return services;
    }

    private sealed class PlaceholderAdminCredentialRepository : IAdminCredentialRepository;

    private sealed class PlaceholderAppDataRepository : IAppDataRepository;

    private sealed class PlaceholderDriverRepository : IDriverRepository;

    private sealed class PlaceholderWeekendRepository : IWeekendRepository;

    private sealed class SystemClock : IClock
    {
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    }

    private sealed class DeferredSignedCookieService : ISignedCookieService
    {
        public string Sign(string value)
        {
            throw CreateSubphaseException();
        }

        public bool TryVerify(string signedValue, out string? unsignedValue)
        {
            unsignedValue = null;
            throw CreateSubphaseException();
        }

        private static NotSupportedException CreateSubphaseException()
        {
            return new NotSupportedException("Cookie signing and verification are deferred to Subphase 4.");
        }
    }
}
