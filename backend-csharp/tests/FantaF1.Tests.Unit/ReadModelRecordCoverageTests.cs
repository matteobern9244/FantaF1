using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Configuration;

namespace FantaF1.Tests.Unit;

public sealed class ReadModelRecordCoverageTests
{
    [Fact]
    public void OfficialResultsRecords_ExposeValues_Equality_AndToString()
    {
        var lookup = new HighlightsLookupDocument(
            "https://youtu.be/highlights",
            "2026-03-21T10:00:00Z",
            "resolved",
            "youtube");
        var sameLookup = new HighlightsLookupDocument(
            "https://youtu.be/highlights",
            "2026-03-21T10:00:00Z",
            "resolved",
            "youtube");
        var results = new OfficialResultsDocument(
            "nor",
            "lec",
            "pia",
            "ver",
            "finished",
            "https://youtu.be/highlights");
        var sameResults = new OfficialResultsDocument(
            "nor",
            "lec",
            "pia",
            "ver",
            "finished",
            "https://youtu.be/highlights");

        Assert.Equal("https://youtu.be/highlights", lookup.HighlightsVideoUrl);
        Assert.Equal("2026-03-21T10:00:00Z", lookup.HighlightsLookupCheckedAt);
        Assert.Equal("resolved", lookup.HighlightsLookupStatus);
        Assert.Equal("youtube", lookup.HighlightsLookupSource);
        Assert.Equal(lookup, sameLookup);
        Assert.Contains(nameof(HighlightsLookupDocument), lookup.ToString(), StringComparison.Ordinal);

        Assert.Equal("nor", results.First);
        Assert.Equal("lec", results.Second);
        Assert.Equal("pia", results.Third);
        Assert.Equal("ver", results.Pole);
        Assert.Equal("finished", results.RacePhase);
        Assert.Equal("https://youtu.be/highlights", results.HighlightsVideoUrl);
        Assert.Equal(results, sameResults);
        Assert.Contains(nameof(OfficialResultsDocument), results.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void ReadRouteRecords_ExposeProperties_Ids_AndToString()
    {
        var prediction = new PredictionDocument("nor", "lec", "pia", "ver");
        var user = new AppDataUserDocument("Matteo", prediction, 42);
        var historyPrediction = new AppDataHistoryUserPredictionDocument(prediction, 12);
        var historyRecord = new AppDataHistoryRecordDocument(
            "Australia",
            "race-1",
            "2026-03-15",
            prediction,
            new Dictionary<string, AppDataHistoryUserPredictionDocument>
            {
                ["Matteo"] = historyPrediction,
            });
        var weekendState = new WeekendPredictionStateDocument(
            new Dictionary<string, PredictionDocument>
            {
                ["Matteo"] = prediction,
            },
            prediction);
        var appData = new AppDataDocument(
            new[] { user },
            new[] { historyRecord },
            "Australia",
            prediction,
            "race-1",
            new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = weekendState,
            });
        var driver = new DriverDocument("nor", "Lando Norris", "McLaren", "#ff8000", "avatar", "mclaren");
        var weekendSession = new WeekendSessionDocument("Qualifying", "2026-03-14T15:00:00Z");
        var weekend = new WeekendDocument(
            "race-2",
            "China",
            "Chinese Grand Prix 2026",
            2,
            "21-23 Mar",
            "https://formula1.com/china",
            "hero",
            "outline",
            true,
            "2026-03-21",
            "2026-03-23",
            "2026-03-23T07:00:00Z",
            new[] { weekendSession },
            "https://youtu.be/china",
            "2026-03-23T10:00:00Z",
            "resolved",
            "youtube");
        var driverStanding = new DriverStandingDocument(1, "nor", "Lando Norris", "McLaren", 25, "avatar", "#ff8000");
        var constructorStanding = new ConstructorStandingDocument(1, "McLaren", 25, "#ff8000", "logo");
        var standings = new StandingsDocument(new[] { driverStanding }, new[] { constructorStanding }, "2026-03-23T20:00:00Z");

        Assert.Equal("nor", prediction.First);
        Assert.Equal("Matteo", user.Name);
        Assert.Equal(prediction, historyPrediction.Prediction);
        Assert.Equal("Australia", historyRecord.GpName);
        Assert.Equal(prediction, weekendState.RaceResults);
        Assert.Equal("Singleton", appData.Id);
        Assert.Equal("Australia", appData.GpName);
        Assert.Equal("nor", driver.Id);
        Assert.Equal("Qualifying", weekendSession.Name);
        Assert.Equal("race-2", weekend.Id);
        Assert.True(weekend.IsSprintWeekend);
        Assert.Single(weekend.Sessions);
        Assert.Equal(1, driverStanding.Position);
        Assert.Equal("McLaren", constructorStanding.Team);
        Assert.Equal("current", standings.Id);
        Assert.Single(standings.DriverStandings);
        Assert.Single(standings.ConstructorStandings);

        Assert.Contains(nameof(PredictionDocument), prediction.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(AppDataUserDocument), user.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(AppDataHistoryUserPredictionDocument), historyPrediction.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(AppDataHistoryRecordDocument), historyRecord.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(WeekendPredictionStateDocument), weekendState.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(AppDataDocument), appData.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(DriverDocument), driver.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(WeekendSessionDocument), weekendSession.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(WeekendDocument), weekend.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(DriverStandingDocument), driverStanding.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(ConstructorStandingDocument), constructorStanding.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(StandingsDocument), standings.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void PortingConfigurationRecords_ExposeNestedValues_Equality_AndToString()
    {
        var drivers = new PortingDriversSourceConfig(
            "https://stats.example/drivers",
            "https://formula1.example/drivers",
            "it-IT",
            20,
            "test-agent",
            "it-IT,it;q=0.9",
            new Dictionary<string, string> { ["Max Verstappen"] = "ver" },
            new Dictionary<string, string> { ["max-verstappen"] = "ver" },
            new Dictionary<string, string> { ["Scuderia Ferrari"] = "Ferrari" },
            new Dictionary<string, string> { ["Ferrari"] = "ferrari" },
            new Dictionary<string, string> { ["Ferrari"] = "#dc0000" });
        var calendar = new PortingCalendarSourceConfig(
            "https://formula1.example/calendar",
            24,
            "test-agent",
            "it-IT,it;q=0.9");
        var config = new PortingAppConfig(2026, drivers, calendar);
        var sameConfig = new PortingAppConfig(2026, drivers, calendar);

        Assert.Equal(2026, config.CurrentYear);
        Assert.Equal("https://stats.example/drivers", config.Drivers.StatsUrl);
        Assert.Equal("https://formula1.example/calendar", config.Calendar.SeasonUrl);
        Assert.Equal(config, sameConfig);
        Assert.Contains(nameof(PortingDriversSourceConfig), drivers.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(PortingCalendarSourceConfig), calendar.ToString(), StringComparison.Ordinal);
        Assert.Contains(nameof(PortingAppConfig), config.ToString(), StringComparison.Ordinal);
    }
}
