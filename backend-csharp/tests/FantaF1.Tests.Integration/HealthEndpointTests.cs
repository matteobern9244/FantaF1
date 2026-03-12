using System.Net;
using System.Net.Http.Json;
using FantaF1.Api.Controllers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace FantaF1.Tests.Integration;

public sealed class HealthEndpointTests
{
    [Fact]
    public void Health_controller_rejects_a_null_service_dependency()
    {
        Assert.Throws<ArgumentNullException>(() => new HealthController(null!));
    }

    [Fact]
    public async Task Development_health_endpoint_returns_the_expected_payload()
    {
        await using var factory = CreateFactory(
            environmentName: "Development",
            configurationValues: new Dictionary<string, string?>
            {
                ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_porting?retryWrites=true&w=majority",
            });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.NotNull(payload);
        Assert.Equal("ok", payload["status"]?.ToString());
        Assert.Equal(DateTimeOffset.UtcNow.Year.ToString(), payload["year"]?.ToString());
        Assert.Equal("1", payload["dbState"]?.ToString());
        Assert.Equal("development", payload["environment"]?.ToString());
        Assert.Equal("fantaf1_porting", payload["databaseTarget"]?.ToString());
    }

    [Fact]
    public async Task Staging_health_endpoint_defaults_to_the_staging_database()
    {
        await using var factory = CreateFactory(environmentName: "Staging");
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<Dictionary<string, object>>("/api/health");

        Assert.NotNull(payload);
        Assert.Equal("staging", payload["environment"]?.ToString());
        Assert.Equal("fantaf1_staging", payload["databaseTarget"]?.ToString());
    }

    [Fact]
    public async Task Staging_health_endpoint_supports_the_local_smoke_porting_database_when_the_override_declares_it()
    {
        await using var factory = CreateFactory(
            environmentName: "Staging",
            configurationValues: new Dictionary<string, string?>
            {
                ["MONGODB_DB_NAME_OVERRIDE"] = "fantaf1_porting",
            });
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<Dictionary<string, object>>("/api/health");

        Assert.NotNull(payload);
        Assert.Equal("staging", payload["environment"]?.ToString());
        Assert.Equal("fantaf1_porting", payload["databaseTarget"]?.ToString());
    }

    [Fact]
    public async Task Production_health_endpoint_returns_the_production_database_target()
    {
        await using var factory = CreateFactory(
            environmentName: "Production",
            configurationValues: new Dictionary<string, string?>
            {
                ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1?retryWrites=true&w=majority",
            });
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<Dictionary<string, object>>("/api/health");

        Assert.NotNull(payload);
        Assert.Equal("production", payload["environment"]?.ToString());
        Assert.Equal("fantaf1", payload["databaseTarget"]?.ToString());
    }

    private static WebApplicationFactory<Program> CreateFactory(
        string environmentName,
        IReadOnlyDictionary<string, string?>? configurationValues = null)
    {
        return new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment(environmentName);
                builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                {
                    if (configurationValues is not null)
                    {
                        configurationBuilder.AddInMemoryCollection(configurationValues);
                    }
                });
            });
    }
}
