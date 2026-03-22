using FantaF1.Domain.ReadModels;
using FantaF1.Domain.Results;
using FantaF1.Domain.SaveValidation;

namespace FantaF1.Tests.Unit;

public sealed class DomainTargetEdgeCaseTests
{
    [Fact]
    public void Race_phase_resolver_short_circuits_to_finished_when_official_results_are_present()
    {
        var resolver = new RacePhaseResolver();

        var phase = resolver.Resolve(
            null,
            new PredictionDocument("ver", "lec", "nor", null),
            new DateTimeOffset(2026, 03, 01, 13, 59, 59, TimeSpan.Zero));

        Assert.Equal("finished", phase);
    }

    [Fact]
    public void Race_lock_validator_keeps_a_started_race_unlocked_when_no_payloads_are_available()
    {
        var validator = new RaceLockValidator();
        var selectedRace = new WeekendDocument(
            "race-1",
            "Race 1",
            "Race 1",
            1,
            null,
            null,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty);

        var isLocked = validator.IsRaceLocked(
            selectedRace,
            null,
            null,
            new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero));

        Assert.False(isLocked);
    }

    [Fact]
    public void Formula_one_results_url_builder_rejects_urls_with_query_or_fragment_components()
    {
        var builder = new FormulaOneResultsUrlBuilder();

        Assert.Equal(
            string.Empty,
            builder.Build("https://www.formula1.com/en/racing/2026/china?view=full", "1280"));
        Assert.Equal(
            string.Empty,
            builder.Build("https://www.formula1.com/en/racing/2026/china#results", "1280"));
        Assert.Equal(
            string.Empty,
            builder.Build("https://www.formula1.com/en/racing/2026/china", "   "));
    }
}
