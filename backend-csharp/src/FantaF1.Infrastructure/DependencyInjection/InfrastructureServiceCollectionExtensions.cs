using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Infrastructure.Authentication;
using FantaF1.Infrastructure.Bootstrap;
using FantaF1.Infrastructure.Calendar;
using FantaF1.Infrastructure.Configuration;
using FantaF1.Infrastructure.Drivers;
using FantaF1.Infrastructure.Mongo;
using FantaF1.Infrastructure.Results;
using FantaF1.Infrastructure.Standings;
using FantaF1.Domain.Results;
using FantaF1.Domain.SaveValidation;
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
        services.AddSingleton<MongoLegacyWriteDocumentMapper>();
        services.AddSingleton<RaceHighlightsLookupPolicy>(_ => new RaceHighlightsLookupPolicy(TimeSpan.FromHours(OfficialResultsReferenceData.HighlightsLookupMissingTtlHours)));
        services.AddSingleton(sp => sp.GetRequiredService<PortingAppConfigLoader>().Load());
        services.AddSingleton<PortingAppConfigLoader>();
        services.AddSingleton<ParticipantRosterValidator>();
        services.AddScoped<IAdminCredentialRepository>(sp =>
        {
            var configuration = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var seedOptions = sp.GetRequiredService<IOptions<ContractAdminCredentialSeedOptions>>();
            var passwordHasher = sp.GetRequiredService<NodeCompatibleScryptPasswordHasher>();
            var disableHostedBootstrap = string.Equals(
                configuration["Bootstrap:DisableHostedService"],
                "true",
                StringComparison.OrdinalIgnoreCase);

            return disableHostedBootstrap
                ? new ContractAdminCredentialRepository(seedOptions, passwordHasher)
                : new ContractAdminCredentialRepository(
                    seedOptions,
                    passwordHasher,
                    sp.GetRequiredService<IMongoDatabase>());
        });
        services.AddScoped<IAppDataRepository, MongoAppDataRepository>();
        services.AddSingleton<IRuntimeEnvironmentProfileResolver, ConfigurationRuntimeEnvironmentProfileResolver>();
        services.AddSingleton<IRequestIdGenerator, GuidRequestIdGenerator>();
        services.AddHttpClient<OfficialDriverSyncService>();
        services.AddScoped<IDriverRepository, MongoDriverRepository>();
        services.AddHttpClient<OfficialCalendarSyncService>();
        services.AddHttpClient<IRaceHighlightsLookupService, RaceHighlightsLookupService>();
        services.AddHttpClient<IResultsSourceClient, ResultsSourceClient>();
        services.AddScoped<IBackgroundSyncService, BackgroundSyncService>();
        services.AddScoped<IStandingsRepository, MongoStandingsRepository>();
        services.AddScoped<IWeekendRepository, MongoWeekendRepository>();
        services.AddSingleton<IStandingsParser, OfficialStandingsParser>();
        services.AddHttpClient<IStandingsSourceClient, StandingsSourceClient>();
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<ISignedCookieService, HmacSignedCookieService>();

        return services;
    }

    private sealed class SystemClock : IClock
    {
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    }
}
