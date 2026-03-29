using FantaF1.Infrastructure.Configuration;

namespace FantaF1.Tests.Unit;

public sealed class RuntimeEnvironmentProfileTextTests
{
    [Fact]
    public void Disallowed_database_target_message_includes_the_database_and_environment_names()
    {
        var message = RuntimeEnvironmentProfileText.DisallowedDatabaseTarget("fantaf1_dev", "production");

        Assert.Equal(
            "Database target \"fantaf1_dev\" is not allowed for environment \"production\".",
            message);
    }

    [Fact]
    public void Mongo_uri_target_mismatch_message_includes_both_database_targets()
    {
        var message = RuntimeEnvironmentProfileText.MongoUriTargetMismatch("fantaf1_dev", "fantaf1");

        Assert.Equal(
            "MONGODB_URI targets \"fantaf1_dev\" but the resolved database target is \"fantaf1\".",
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
            $"Unsupported ASP.NET Core environment \"{expectedLabel}\". Expected Development or Production.",
            message);
    }
}
