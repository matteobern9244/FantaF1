using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.System;
using FantaF1.Infrastructure.Authentication;
using FantaF1.Infrastructure.Configuration;
using FantaF1.Infrastructure.Mongo;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

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
        services.AddSingleton<IMongoClient>(sp =>
        {
            var configuration = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var connectionString = configuration[RuntimeEnvironmentProfileContract.MongoUriKey];

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("MONGODB_URI environment variable is not defined");
            }

            return new MongoClient(connectionString);
        });
        services.AddScoped<IMongoDatabase>(sp =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            var profile = sp.GetRequiredService<IRuntimeEnvironmentProfileResolver>().ResolveCurrentProfile();
            return client.GetDatabase(profile.DatabaseTarget);
        });
        services.AddSingleton<MongoLegacyReadDocumentMapper>();
        services.AddScoped<IAppDataRepository, MongoAppDataRepository>();
        services.AddSingleton<IRuntimeEnvironmentProfileResolver, ConfigurationRuntimeEnvironmentProfileResolver>();
        services.AddScoped<IDriverRepository, MongoDriverRepository>();
        services.AddScoped<IWeekendRepository, MongoWeekendRepository>();
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<ISignedCookieService, HmacSignedCookieService>();

        return services;
    }

    private sealed class SystemClock : IClock
    {
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    }
}
