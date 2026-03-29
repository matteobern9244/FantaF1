namespace FantaF1.Infrastructure.Configuration;

internal static class RuntimeEnvironmentProfileContract
{
    internal const string DevelopmentEnvironmentName = "Development";
    internal const string DevelopmentEnvironmentPayload = "development";
    internal const string ProductionEnvironmentName = "Production";
    internal const string ProductionEnvironmentPayload = "production";
    internal const string ProductionLikeEnvironmentName = "ProductionLike";
    internal const string ProductionLikeEnvironmentPayload = "production-like";

    internal const string DevelopmentDatabaseName = "fantaf1_dev";
    internal const string ContinuousIntegrationDatabaseName = "fantaf1_ci";
    internal const string ProductionDatabaseName = "fantaf1";
    internal const string ProductionLikeDatabaseName = DevelopmentDatabaseName;

    internal const string MongoUriKey = "MONGODB_URI";
    internal const string MongoDatabaseNameOverrideKey = "MONGODB_DB_NAME_OVERRIDE";
}
