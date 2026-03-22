using System.Reflection;
using FantaF1.Domain.Results;

namespace FantaF1.Tests.Unit;

public sealed class OfficialResultsDriverReferenceDataTests
{
    [Fact]
    public void Driver_aliases_and_id_overrides_contains_the_expected_reference_data()
    {
        var referenceDataType = typeof(OfficialResultsParser).Assembly.GetType(
            "FantaF1.Domain.Results.OfficialResultsDriverReferenceData",
            throwOnError: true)!;
        var aliases = GetDictionary(referenceDataType, "DriverAliases");
        var overrides = GetDictionary(referenceDataType, "DriverIdOverrides");

        Assert.Equal("Alexander Albon", aliases["Alex Albon"]);
        Assert.Equal("Oliver Bearman", aliases["Ollie Bearman"]);

        Assert.Equal(24, overrides.Count);
        Assert.Equal("ver", overrides["Max Verstappen"]);
        Assert.Equal("alb", overrides["Alexander Albon"]);
        Assert.Equal("bea", overrides["Oliver Bearman"]);
        Assert.Equal("bot", overrides["Valtteri Bottas"]);
        Assert.Equal("per", overrides["Sergio Perez"]);
    }

    private static IReadOnlyDictionary<string, string> GetDictionary(Type referenceDataType, string fieldName)
    {
        return (IReadOnlyDictionary<string, string>)referenceDataType
            .GetField(fieldName, BindingFlags.Public | BindingFlags.Static)!
            .GetValue(null)!;
    }
}
