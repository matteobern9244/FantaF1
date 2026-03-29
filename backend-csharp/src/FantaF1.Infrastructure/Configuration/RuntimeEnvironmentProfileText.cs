namespace FantaF1.Infrastructure.Configuration;

internal static class RuntimeEnvironmentProfileText
{
    internal static string DisallowedDatabaseTarget(string databaseTarget, string environment)
    {
        return $"Database target \"{databaseTarget}\" is not allowed for environment \"{environment}\".";
    }

    internal static string MongoUriTargetMismatch(string mongoUriDatabaseName, string resolvedDatabaseTarget)
    {
        return $"MONGODB_URI targets \"{mongoUriDatabaseName}\" but the resolved database target is \"{resolvedDatabaseTarget}\".";
    }

    internal static string UnsupportedEnvironment(string? environmentName)
    {
        var label = string.IsNullOrWhiteSpace(environmentName) ? "unknown" : environmentName.Trim();
        return $"Unsupported ASP.NET Core environment \"{label}\". Expected Development, Production or ProductionLike.";
    }
}
