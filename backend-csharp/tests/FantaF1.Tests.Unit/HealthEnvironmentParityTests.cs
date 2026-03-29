using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;
using FantaF1.Infrastructure.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace FantaF1.Tests.Unit;

public sealed class HealthEnvironmentParityTests
{
    [Fact]
    public void Health_report_service_builds_the_wire_compatible_payload_from_the_clock_and_environment_profile()
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var resolver = new StubRuntimeEnvironmentProfileResolver(
            new RuntimeEnvironmentProfile("production", "fantaf1"));
        var service = new HealthReportService(clock, resolver);

        var report = service.GetCurrentReport();

        Assert.Equal("ok", report.Status);
        Assert.Equal(2026, report.Year);
        Assert.Equal(1, report.DbState);
        Assert.Equal("production", report.Environment);
        Assert.Equal("fantaf1", report.DatabaseTarget);
    }

    [Fact]
    public void Health_report_service_rejects_a_null_clock()
    {
        var resolver = new StubRuntimeEnvironmentProfileResolver(
            new RuntimeEnvironmentProfile("development", "fantaf1_dev"));

        Assert.Throws<ArgumentNullException>(() => new HealthReportService(null!, resolver));
    }

    [Fact]
    public void Health_report_service_rejects_a_null_environment_profile_resolver()
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        Assert.Throws<ArgumentNullException>(() => new HealthReportService(clock, null!));
    }

    [Fact]
    public void Resolver_rejects_a_null_host_environment_dependency()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([])
            .Build();

        Assert.Throws<ArgumentNullException>(() => new ConfigurationRuntimeEnvironmentProfileResolver(null!, configuration));
    }

    [Fact]
    public void Resolver_rejects_a_null_configuration_dependency()
    {
        Assert.Throws<ArgumentNullException>(() => new ConfigurationRuntimeEnvironmentProfileResolver(
            new StubHostEnvironment("Development"),
            null!));
    }

    [Fact]
    public void Resolver_maps_development_to_the_dev_database_by_default()
    {
        var resolver = CreateResolver("Development");

        var profile = resolver.ResolveCurrentProfile();

        Assert.Equal("development", profile.Environment);
        Assert.Equal("fantaf1_dev", profile.DatabaseTarget);
    }

    [Fact]
    public void Resolver_allows_the_ci_database_when_the_override_declares_it()
    {
        var resolver = CreateResolver(
            "Development",
            mongoDatabaseNameOverride: "fantaf1_ci");

        var profile = resolver.ResolveCurrentProfile();

        Assert.Equal("development", profile.Environment);
        Assert.Equal("fantaf1_ci", profile.DatabaseTarget);
    }

    [Fact]
    public void Resolver_rejects_staging_as_an_unsupported_host_environment()
    {
        var resolver = CreateResolver("Staging");

        var exception = Assert.Throws<InvalidOperationException>(() => resolver.ResolveCurrentProfile());

        Assert.Equal(
            "Unsupported ASP.NET Core environment \"Staging\". Expected Development, Production or ProductionLike.",
            exception.Message);
    }

    [Fact]
    public void Resolver_maps_production_to_the_production_database()
    {
        var resolver = CreateResolver("Production");

        var profile = resolver.ResolveCurrentProfile();

        Assert.Equal("production", profile.Environment);
        Assert.Equal("fantaf1", profile.DatabaseTarget);
    }

    [Fact]
    public void Resolver_maps_production_like_to_the_isolated_production_like_database()
    {
        var resolver = CreateResolver("ProductionLike");

        var profile = resolver.ResolveCurrentProfile();

        Assert.Equal("production-like", profile.Environment);
        Assert.Equal("fantaf1_dev", profile.DatabaseTarget);
    }

    [Fact]
    public void Resolver_falls_back_to_the_environment_default_when_the_uri_is_not_a_valid_absolute_uri()
    {
        var resolver = CreateResolver(
            "Development",
            mongoUri: "not-a-valid-uri");

        var profile = resolver.ResolveCurrentProfile();

        Assert.Equal("development", profile.Environment);
        Assert.Equal("fantaf1_dev", profile.DatabaseTarget);
    }

    [Fact]
    public void Resolver_ignores_blank_database_overrides()
    {
        var resolver = CreateResolver(
            "Development",
            mongoDatabaseNameOverride: "   ",
            mongoUri: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority");

        var profile = resolver.ResolveCurrentProfile();

        Assert.Equal("fantaf1_dev", profile.DatabaseTarget);
    }

    [Fact]
    public void Resolver_rejects_database_targets_that_are_not_allowed_for_the_current_environment()
    {
        var resolver = CreateResolver(
            "Development",
            mongoDatabaseNameOverride: "fantaf1_random");

        var exception = Assert.Throws<InvalidOperationException>(() => resolver.ResolveCurrentProfile());

        Assert.Equal(
            "Database target \"fantaf1_random\" is not allowed for environment \"development\".",
            exception.Message);
    }

    [Fact]
    public void Resolver_rejects_mismatched_uri_and_override_targets()
    {
        var resolver = CreateResolver(
            "Development",
            mongoUri: "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_ci?retryWrites=true&w=majority",
            mongoDatabaseNameOverride: "fantaf1_dev");

        var exception = Assert.Throws<InvalidOperationException>(() => resolver.ResolveCurrentProfile());

        Assert.Equal(
            "MONGODB_URI targets \"fantaf1_ci\" but the resolved database target is \"fantaf1_dev\".",
            exception.Message);
    }

    [Fact]
    public void Resolver_falls_back_to_the_environment_default_when_the_uri_has_no_database_path()
    {
        var resolver = CreateResolver(
            "Production",
            mongoUri: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority");

        var profile = resolver.ResolveCurrentProfile();

        Assert.Equal("production", profile.Environment);
        Assert.Equal("fantaf1", profile.DatabaseTarget);
    }

    [Fact]
    public void Resolver_rejects_unknown_host_environment_names()
    {
        var resolver = CreateResolver("QualityAssurance");

        var exception = Assert.Throws<InvalidOperationException>(() => resolver.ResolveCurrentProfile());

        Assert.Equal(
            "Unsupported ASP.NET Core environment \"QualityAssurance\". Expected Development, Production or ProductionLike.",
            exception.Message);
    }

    [Fact]
    public void Resolver_reports_unknown_for_a_missing_host_environment_name()
    {
        var resolver = CreateResolver(null!);

        var exception = Assert.Throws<InvalidOperationException>(() => resolver.ResolveCurrentProfile());

        Assert.Equal(
            "Unsupported ASP.NET Core environment \"unknown\". Expected Development, Production or ProductionLike.",
            exception.Message);
    }

    private static ConfigurationRuntimeEnvironmentProfileResolver CreateResolver(
        string environmentName,
        string? mongoUri = null,
        string? mongoDatabaseNameOverride = null)
    {
        var values = new Dictionary<string, string?>();

        if (mongoUri is not null)
        {
            values["MONGODB_URI"] = mongoUri;
        }

        if (mongoDatabaseNameOverride is not null)
        {
            values["MONGODB_DB_NAME_OVERRIDE"] = mongoDatabaseNameOverride;
        }

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();

        return new ConfigurationRuntimeEnvironmentProfileResolver(
            new StubHostEnvironment(environmentName),
            configuration);
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class StubRuntimeEnvironmentProfileResolver : IRuntimeEnvironmentProfileResolver
    {
        private readonly RuntimeEnvironmentProfile _profile;

        public StubRuntimeEnvironmentProfileResolver(RuntimeEnvironmentProfile profile)
        {
            _profile = profile;
        }

        public RuntimeEnvironmentProfile ResolveCurrentProfile()
        {
            return _profile;
        }
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public StubHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }

        public string ApplicationName { get; set; } = "FantaF1.Tests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
