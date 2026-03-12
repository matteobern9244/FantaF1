using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.System;
using FantaF1.Infrastructure.Authentication;
using FantaF1.Infrastructure.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace FantaF1.Infrastructure.DependencyInjection;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddFantaF1Infrastructure(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddSingleton(sp =>
        {
            var configuration = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var configuredPasswordHashHex = configuration[ContractAdminCredentialSeedOptions.PasswordHashHexConfigurationPath];
            var configuredPasswordSalt = configuration[ContractAdminCredentialSeedOptions.PasswordSaltConfigurationPath];

            return Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordHashHex = string.IsNullOrWhiteSpace(configuredPasswordHashHex)
                    ? ContractAdminCredentialSeedOptions.DefaultPasswordHashHex
                    : configuredPasswordHashHex,
                PasswordSalt = string.IsNullOrWhiteSpace(configuredPasswordSalt)
                    ? ContractAdminCredentialSeedOptions.DefaultPasswordSalt
                    : configuredPasswordSalt,
            });
        });
        services.AddSingleton<NodeCompatibleScryptPasswordHasher>();
        services.AddScoped<IAdminCredentialRepository, ContractAdminCredentialRepository>();
        services.AddScoped<IAppDataRepository, PlaceholderAppDataRepository>();
        services.AddScoped<IDriverRepository, PlaceholderDriverRepository>();
        services.AddSingleton<IRuntimeEnvironmentProfileResolver, ConfigurationRuntimeEnvironmentProfileResolver>();
        services.AddScoped<IWeekendRepository, PlaceholderWeekendRepository>();
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<ISignedCookieService, HmacSignedCookieService>();

        return services;
    }

    private sealed class PlaceholderAppDataRepository : IAppDataRepository;

    private sealed class PlaceholderDriverRepository : IDriverRepository;

    private sealed class PlaceholderWeekendRepository : IWeekendRepository;

    private sealed class SystemClock : IClock
    {
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    }
}
