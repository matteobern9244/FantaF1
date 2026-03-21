using FantaF1.Infrastructure.Configuration;

namespace FantaF1.Tests.Unit;

public sealed class RuntimeEnvironmentProfileTextTests
{
    [Fact]
    public void Disallowed_database_target_message_includes_the_database_and_environment_names()
    {
        var message = RuntimeEnvironmentProfileText.DisallowedDatabaseTarget("staging", "Production");

        Assert.Equal(
            "Database target \"staging\" is not allowed for environment \"Production\".",
            message);
    }

    [Fact]
    public void Mongo_uri_target_mismatch_message_includes_both_database_targets()
    {
        var message = RuntimeEnvironmentProfileText.MongoUriTargetMismatch("fantaf1_prod", "fantaf1_staging");

        Assert.Equal(
            "MONGODB_URI targets \"fantaf1_prod\" but the resolved database target is \"fantaf1_staging\".",
            message);
    }

    [Theory]
    [InlineData(null, "unknown")]
    [InlineData("", "unknown")]
    [InlineData("  Development  ", "Development")]
    public void Unsupported_environment_message_normalizes_the_environment_label(
        string? environmentName,
        string expectedLabel)
    {
        var message = RuntimeEnvironmentProfileText.UnsupportedEnvironment(environmentName);

        Assert.Equal(
            $"Unsupported ASP.NET Core environment \"{expectedLabel}\". Expected Development, Staging, or Production.",
            message);
    }
}
