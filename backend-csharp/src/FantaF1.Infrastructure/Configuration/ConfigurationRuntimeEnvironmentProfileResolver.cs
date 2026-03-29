using FantaF1.Application.Abstractions.System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace FantaF1.Infrastructure.Configuration;

public sealed class ConfigurationRuntimeEnvironmentProfileResolver : IRuntimeEnvironmentProfileResolver
{
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _hostEnvironment;

    public ConfigurationRuntimeEnvironmentProfileResolver(
        IHostEnvironment hostEnvironment,
        IConfiguration configuration)
    {
        _hostEnvironment = hostEnvironment ?? throw new ArgumentNullException(nameof(hostEnvironment));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public RuntimeEnvironmentProfile ResolveCurrentProfile()
    {
        var environment = NormalizeEnvironment(_hostEnvironment.EnvironmentName);
        var mongoDatabaseNameOverride = NormalizeDatabaseTarget(
            _configuration[RuntimeEnvironmentProfileContract.MongoDatabaseNameOverrideKey]);
        var mongoUriDatabaseName = ExtractMongoDatabaseName(_configuration[RuntimeEnvironmentProfileContract.MongoUriKey]);
        var resolvedDatabaseTarget = ResolveDatabaseTarget(
            environment,
            mongoDatabaseNameOverride,
            mongoUriDatabaseName);

        ValidateAllowedDatabaseTarget(environment, resolvedDatabaseTarget);

        if (mongoUriDatabaseName is not null && !string.Equals(mongoUriDatabaseName, resolvedDatabaseTarget, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                RuntimeEnvironmentProfileText.MongoUriTargetMismatch(
                    mongoUriDatabaseName,
                    resolvedDatabaseTarget));
        }

        return new RuntimeEnvironmentProfile(environment, resolvedDatabaseTarget);
    }

    private static string NormalizeEnvironment(string? environmentName)
    {
        return environmentName?.Trim() switch
        {
            var value when string.Equals(value, RuntimeEnvironmentProfileContract.DevelopmentEnvironmentName, StringComparison.OrdinalIgnoreCase)
                => RuntimeEnvironmentProfileContract.DevelopmentEnvironmentPayload,
            var value when string.Equals(value, RuntimeEnvironmentProfileContract.ProductionEnvironmentName, StringComparison.OrdinalIgnoreCase)
                => RuntimeEnvironmentProfileContract.ProductionEnvironmentPayload,
            _ => throw new InvalidOperationException(
                RuntimeEnvironmentProfileText.UnsupportedEnvironment(environmentName)),
        };
    }

    private static string ResolveDatabaseTarget(
        string environment,
        string? mongoDatabaseNameOverride,
        string? mongoUriDatabaseName)
    {
        if (mongoDatabaseNameOverride is not null)
        {
            return mongoDatabaseNameOverride;
        }

        if (mongoUriDatabaseName is not null)
        {
            return mongoUriDatabaseName;
        }

        if (string.Equals(environment, RuntimeEnvironmentProfileContract.DevelopmentEnvironmentPayload, StringComparison.Ordinal))
        {
            return RuntimeEnvironmentProfileContract.DevelopmentDatabaseName;
        }

        return RuntimeEnvironmentProfileContract.ProductionDatabaseName;
    }

    private static void ValidateAllowedDatabaseTarget(string environment, string databaseTarget)
    {
        var isAllowed = string.Equals(environment, RuntimeEnvironmentProfileContract.DevelopmentEnvironmentPayload, StringComparison.Ordinal)
            ? IsAllowedDevelopmentDatabaseTarget(databaseTarget)
            : string.Equals(databaseTarget, RuntimeEnvironmentProfileContract.ProductionDatabaseName, StringComparison.Ordinal);

        if (!isAllowed)
        {
            throw new InvalidOperationException(
                RuntimeEnvironmentProfileText.DisallowedDatabaseTarget(databaseTarget, environment));
        }
    }

    private static string? NormalizeDatabaseTarget(string? databaseTarget)
    {
        var normalizedValue = databaseTarget?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? null : normalizedValue;
    }

    private static bool IsAllowedDevelopmentDatabaseTarget(string databaseTarget)
    {
        return string.Equals(databaseTarget, RuntimeEnvironmentProfileContract.DevelopmentDatabaseName, StringComparison.Ordinal)
            || string.Equals(databaseTarget, RuntimeEnvironmentProfileContract.ContinuousIntegrationDatabaseName, StringComparison.Ordinal);
    }

    private static string? ExtractMongoDatabaseName(string? mongoUri)
    {
        if (string.IsNullOrWhiteSpace(mongoUri))
        {
            return null;
        }

        if (!Uri.TryCreate(mongoUri.Trim(), UriKind.Absolute, out var parsedUri))
        {
            return null;
        }

        var databasePath = parsedUri.AbsolutePath.Trim('/');
        return string.IsNullOrWhiteSpace(databasePath) ? null : databasePath;
    }
}
