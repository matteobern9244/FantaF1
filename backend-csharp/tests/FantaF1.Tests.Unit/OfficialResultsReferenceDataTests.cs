using FantaF1.Infrastructure.Results;

namespace FantaF1.Tests.Unit;

public sealed class OfficialResultsReferenceDataTests
{
    [Fact]
    public void HighlightsRaceAliases_contains_expected_races_and_aliases()
    {
        var aliases = OfficialResultsReferenceData.HighlightsRaceAliases;

        Assert.Equal(["Sakhir"], aliases["bahrain"]);
        Assert.Equal(["Jeddah", "Arabia Saudita"], aliases["saudi arabia"]);
        Assert.Equal(["Melbourne", "Albert Park"], aliases["australia"]);
        Assert.Equal(["Giappone", "Suzuka"], aliases["japan"]);
        Assert.Equal(["Cina", "Shanghai"], aliases["china"]);
        Assert.Equal(["Miami"], aliases["miami"]);
        Assert.Equal(["montreal"], aliases["canada"]);
        Assert.Equal(["Monte Carlo", "Montecarlo"], aliases["monaco"]);
        Assert.Equal(["Spagna", "Barcelona", "Barcelona-Catalunya"], aliases["spain"]);
        Assert.Equal(["Spielberg", "Zeltweg"], aliases["austria"]);
        Assert.Equal(["silverstone"], aliases["great britain"]);
        Assert.Equal(["Ungheria", "Budapest", "Hungaroring"], aliases["hungary"]);
        Assert.Equal(["Belgio", "Spa", "Spa Francorchamps"], aliases["belgium"]);
        Assert.Equal(["Olanda", "Zandvoort"], aliases["netherlands"]);
        Assert.Equal(["Italia", "Monza"], aliases["italy"]);
        Assert.Equal(["Madrid"], aliases["madrid"]);
        Assert.Equal(["baku"], aliases["azerbaijan"]);
        Assert.Equal(["Marina Bay"], aliases["singapore"]);
        Assert.Equal(["austin"], aliases["usa"]);
        Assert.Equal(["Messico", "Mexico City"], aliases["mexico"]);
        Assert.Equal(["Brasile", "Interlagos", "Sao Paulo"], aliases["brazil"]);
        Assert.Equal(["vegas"], aliases["las vegas"]);
        Assert.Equal(["Lusail", "Losail"], aliases["qatar"]);
        Assert.Equal(["yas marina"], aliases["abu dhabi"]);
    }

    [Fact]
    public void HighlightsRaceAliases_does_not_contain_obsolete_races()
    {
        var aliases = OfficialResultsReferenceData.HighlightsRaceAliases;
        Assert.False(aliases.ContainsKey("emilia romagna"));
    }
}
