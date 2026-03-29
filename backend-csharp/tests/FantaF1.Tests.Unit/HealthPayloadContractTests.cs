using System.Text.Json;
using FantaF1.Application.Abstractions.Services;

namespace FantaF1.Tests.Unit;

public sealed class HealthPayloadContractTests
{
    private static readonly JsonSerializerOptions WebJsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Health_report_serialization_matches_the_node_health_payload_contract()
    {
        var report = new HealthReport(
            Status: "ok",
            Year: 2026,
            DbState: 1,
            Environment: "production",
            DatabaseTarget: "fantaf1");

        var payload = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(report, WebJsonOptions),
            WebJsonOptions);

        Assert.NotNull(payload);
        Assert.Equal(5, payload.Count);
        Assert.Equal(
            ["databaseTarget", "dbState", "environment", "status", "year"],
            payload.Keys.OrderBy(key => key, StringComparer.Ordinal).ToArray());
        Assert.Equal("ok", payload["status"].GetString());
        Assert.Equal(2026, payload["year"].GetInt32());
        Assert.Equal(1, payload["dbState"].GetInt32());
        Assert.Equal("production", payload["environment"].GetString());
        Assert.Equal("fantaf1", payload["databaseTarget"].GetString());
    }
}
