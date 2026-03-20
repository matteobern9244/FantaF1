using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.Results;

namespace FantaF1.Tests.Unit;

public sealed class ResultsServiceTests
{
    [Fact]
    public void Results_service_rejects_null_dependencies()
    {
        var weekendRepository = new StubWeekendRepository([]);
        var sourceClient = new StubResultsSourceClient();
        var cache = new RaceResultsCache();
        var urlBuilder = new FormulaOneResultsUrlBuilder();
        var parser = new OfficialResultsParser();
        var racePhaseResolver = new RacePhaseResolver();
        var highlightsLookupService = new StubRaceHighlightsLookupService();
        var clock = new StubClock(new DateTimeOffset(2026, 03, 13, 10, 00, 00, TimeSpan.Zero));

        Assert.Throws<ArgumentNullException>(() => new ResultsService(null!, sourceClient, cache, urlBuilder, parser, racePhaseResolver, highlightsLookupService, clock));
        Assert.Throws<ArgumentNullException>(() => new ResultsService(weekendRepository, null!, cache, urlBuilder, parser, racePhaseResolver, highlightsLookupService, clock));
        Assert.Throws<ArgumentNullException>(() => new ResultsService(weekendRepository, sourceClient, null!, urlBuilder, parser, racePhaseResolver, highlightsLookupService, clock));
        Assert.Throws<ArgumentNullException>(() => new ResultsService(weekendRepository, sourceClient, cache, null!, parser, racePhaseResolver, highlightsLookupService, clock));
        Assert.Throws<ArgumentNullException>(() => new ResultsService(weekendRepository, sourceClient, cache, urlBuilder, null!, racePhaseResolver, highlightsLookupService, clock));
        Assert.Throws<ArgumentNullException>(() => new ResultsService(weekendRepository, sourceClient, cache, urlBuilder, parser, null!, highlightsLookupService, clock));
        Assert.Throws<ArgumentNullException>(() => new ResultsService(weekendRepository, sourceClient, cache, urlBuilder, parser, racePhaseResolver, null!, clock));
        Assert.Throws<ArgumentNullException>(() => new ResultsService(weekendRepository, sourceClient, cache, urlBuilder, parser, racePhaseResolver, highlightsLookupService, null!));
    }

    [Fact]
    public void Results_cache_returns_defensive_copies_and_evicts_expired_entries()
    {
        var now = new DateTimeOffset(2026, 03, 13, 10, 00, 00, TimeSpan.Zero);
        var cache = new RaceResultsCache(TimeSpan.FromSeconds(30), () => now);

        var stored = cache.Set("race-1", new PredictionDocument("nor", "ver", "lec", "pia"));
        stored = stored with { First = "mutated" };

        Assert.Equal(new PredictionDocument("nor", "ver", "lec", "pia"), cache.Get("race-1"));

        now = now.AddSeconds(31);

        Assert.Null(cache.Get("race-1"));
    }

    [Fact]
    public void Results_cache_handles_missing_entries_clear_and_invalid_arguments()
    {
        var cache = new RaceResultsCache();

        Assert.Null(cache.Get("missing"));
        Assert.Throws<ArgumentException>(() => cache.Set("", new PredictionDocument("", "", "", "")));
        Assert.Throws<ArgumentNullException>(() => cache.Set("race-1", null!));

        cache.Set("race-1", new PredictionDocument("nor", "ver", "lec", "pia"));
        cache.Clear();

        Assert.Null(cache.Get("race-1"));
    }

    [Fact]
    public void Formula_one_results_url_builder_matches_the_node_contract()
    {
        var builder = new FormulaOneResultsUrlBuilder();

        Assert.Equal(
            "https://www.formula1.com/en/results/2026/races/1280/china",
            builder.Build("https://www.formula1.com/en/racing/2026/china", "1280"));
        Assert.Equal(
            string.Empty,
            builder.Build("https://www.formula1.com/en/racing/2026/china", string.Empty));
        Assert.Equal(
            string.Empty,
            builder.Build("https://www.formula1.com/en/results/2026/china", "1280"));
        Assert.Equal(
            "https://www.formula1.com/en/results/2026/races/1280/china",
            builder.Build("https://www.formula1.com/en/racing/2026/china/", "1280"));
        Assert.Equal(
            string.Empty,
            builder.Build(null, "1280"));
        Assert.Equal(
            string.Empty,
            builder.Build("https://www.formula1.com/en/racing/2026/china", null));
    }

    [Fact]
    public void Official_results_parser_handles_current_markup_and_plain_fallback_tables()
    {
        var parser = new OfficialResultsParser();

        var currentMarkup = """
            <table class="Table-module_table__cKsW2">
              <tbody>
                <tr><td>1</td><td>4</td><td><span>Lando</span>&nbsp;<span>Norris</span><span>NOR</span></td></tr>
                <tr><td>2</td><td>1</td><td><span>Max</span>&nbsp;<span>Verstappen</span><span>VER</span></td></tr>
                <tr><td>3</td><td>16</td><td><span>Charles</span>&nbsp;<span>Leclerc</span><span>LEC</span></td></tr>
              </tbody>
            </table>
            """;
        var fallbackMarkup = """
            <table>
              <tbody>
                <tr><td>1</td><td>23</td><td>Alex Albon</td></tr>
                <tr><td>2</td><td>87</td><td>Ollie Bearman</td></tr>
                <tr><td>3</td><td>16</td><td>Charles Leclerc</td></tr>
              </tbody>
            </table>
            """;

        Assert.Equal(
            new PredictionDocument("nor", "ver", "lec", null),
            parser.ParseRaceClassification(currentMarkup));
        Assert.Equal(
            new PredictionDocument("alb", "bea", "lec", null),
            parser.ParseRaceClassification(fallbackMarkup));
        Assert.Equal("alb", parser.ParseBonusDriver("<table><tbody><tr><td>1</td><td>23</td><td>Alex Albon</td></tr></tbody></table>"));
        Assert.Equal(
            new PredictionDocument(string.Empty, string.Empty, string.Empty, null),
            parser.ParseRaceClassification("<section>No results available</section>"));
        Assert.Equal(
            new PredictionDocument(string.Empty, string.Empty, string.Empty, null),
            parser.ParseRaceClassification("<section>Results not published yet</section>"));
        Assert.Equal(
            new PredictionDocument(string.Empty, "alb", string.Empty, null),
            parser.ParseRaceClassification(
                "<table><tr><td>NaN</td><td>4</td><td>Lando Norris</td></tr><tr><td>2</td><td>23</td><td>Alex Albon</td></tr><tr><td>4</td><td>16</td><td>Charles Leclerc</td></tr></table>"));

        // No table in content at all (genericMatch.Success = false)
        Assert.Equal(
            new PredictionDocument(string.Empty, string.Empty, string.Empty, null),
            parser.ParseRaceClassification("plain text with no table markup"));

        // Row with fewer than 3 cells (skipped)
        Assert.Equal(
            new PredictionDocument(string.Empty, string.Empty, string.Empty, null),
            parser.ParseRaceClassification("<table><tbody><tr><td>1</td><td>two cells only</td></tr></tbody></table>"));

        // Position 0 (< 1, skipped)
        Assert.Equal(
            new PredictionDocument(string.Empty, string.Empty, string.Empty, null),
            parser.ParseRaceClassification("<table><tbody><tr><td>0</td><td>4</td><td>Lando Norris</td></tr></tbody></table>"));

        // Driver name not in reference data (ResolveDriverId returns empty, row skipped)
        Assert.Equal(
            new PredictionDocument(string.Empty, string.Empty, string.Empty, null),
            parser.ParseRaceClassification("<table><tbody><tr><td>1</td><td>99</td><td>Unknown Pilot</td></tr></tbody></table>"));

        // Null rawContent (covers ExtractResultsTable null branch)
        Assert.Equal(
            new PredictionDocument(string.Empty, string.Empty, string.Empty, null),
            parser.ParseRaceClassification(null));
        Assert.Equal(string.Empty, parser.ParseBonusDriver(null));
    }

    [Fact]
    public void Race_phase_resolver_matches_the_node_contract()
    {
        var resolver = new RacePhaseResolver();
        var race = CreateWeekend("race-1", raceStartTime: "2026-03-01T14:00:00Z");

        Assert.Equal(
            "open",
            resolver.Resolve(race, new PredictionDocument("", "", "", ""), new DateTimeOffset(2026, 03, 01, 13, 59, 59, TimeSpan.Zero)));
        Assert.Equal(
            "live",
            resolver.Resolve(race, new PredictionDocument("", "", "", "pia"), new DateTimeOffset(2026, 03, 01, 14, 30, 00, TimeSpan.Zero)));
        Assert.Equal(
            "finished",
            resolver.Resolve(race, new PredictionDocument("nor", "ver", "lec", "pia"), new DateTimeOffset(2026, 03, 01, 14, 30, 00, TimeSpan.Zero)));
        Assert.Equal(
            "open",
            resolver.Resolve(CreateWeekend("race-2"), new PredictionDocument("", "", "", ""), new DateTimeOffset(2026, 03, 01, 14, 30, 00, TimeSpan.Zero)));
        Assert.Equal(
            "live",
            resolver.Resolve(CreateWeekend("race-3", endDate: "2026-03-01"), new PredictionDocument("", "", "", ""), new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));
        Assert.Equal(
            "open",
            resolver.Resolve(CreateWeekend("race-4", raceStartTime: "invalid-date"), new PredictionDocument("", "", "", ""), new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));
        Assert.Equal(
            "open",
            resolver.Resolve(null, null, new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));
    }

    [Fact]
    public void Highlights_lookup_policy_default_constructor_uses_6h_ttl()
    {
        // Covers the null branch of missingTtl ?? TimeSpan.FromHours(6) in the constructor
        var policy = new RaceHighlightsLookupPolicy();
        var now = new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero);

        // expired: checkedAt was 11h ago → 11h > 6h default TTL
        Assert.True(policy.ShouldLookup(
            CreateWeekend("expired", endDate: "2026-03-01", highlightsLookupStatus: "missing", highlightsLookupCheckedAt: "2026-03-01T07:00:00.000Z"),
            now));
        // still fresh: checkedAt was 1h ago → 1h < 6h default TTL
        Assert.False(policy.ShouldLookup(
            CreateWeekend("fresh", endDate: "2026-03-01", highlightsLookupStatus: "missing", highlightsLookupCheckedAt: "2026-03-01T17:00:00.000Z"),
            now));
    }

    [Fact]
    public void Highlights_lookup_policy_matches_the_node_contract()
    {
        var policy = new RaceHighlightsLookupPolicy(TimeSpan.FromHours(6));
        var now = new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero);

        Assert.False(policy.ShouldLookup(
            CreateWeekend("linked-race", highlightsVideoUrl: "https://www.youtube.com/watch?v=done", endDate: "2026-03-01"),
            now));
        Assert.False(policy.ShouldLookup(
            CreateWeekend("future-race", endDate: "2026-03-02"),
            now));
        Assert.True(policy.ShouldLookup(
            CreateWeekend("finished-race", endDate: "2026-03-01", highlightsLookupStatus: ""),
            now));
        Assert.False(policy.ShouldLookup(
            CreateWeekend("cached-missing", endDate: "2026-03-01", highlightsLookupStatus: "missing", highlightsLookupCheckedAt: "2026-03-01T15:00:00.000Z"),
            now));
        Assert.True(policy.ShouldLookup(
            CreateWeekend("expired-missing", endDate: "2026-03-01", highlightsLookupStatus: "missing", highlightsLookupCheckedAt: "2026-03-01T10:00:00.000Z"),
            now));
        Assert.False(policy.ShouldLookup(
            CreateWeekend("invalid-date", startDate: "", endDate: "not-a-date"),
            now));
        Assert.True(policy.ShouldLookup(
            CreateWeekend("invalid-checked-at", endDate: "2026-03-01", highlightsLookupStatus: "missing", highlightsLookupCheckedAt: "not-a-date"),
            now));

        // Null race throws
        Assert.Throws<ArgumentNullException>(() => policy.ShouldLookup(null!, now));

        // Null HighlightsLookupStatus treated as non-"missing" → returns true (covers ?? null branch at line 32)
        Assert.True(policy.ShouldLookup(
            CreateWeekend("null-status", endDate: "2026-03-01") with { HighlightsLookupStatus = null },
            now));

        // EndDate invalid, falls back to StartDate (covers second ?? non-null branch)
        Assert.True(policy.ShouldLookup(
            CreateWeekend("start-date-fallback", endDate: "not-a-date"),
            now));

        // EndDate and StartDate both null, falls back to RaceStartTime (covers third ?? non-null branch)
        Assert.True(policy.ShouldLookup(
            CreateWeekend("race-start-fallback", startDate: null, raceStartTime: "2026-03-01T14:00:00Z"),
            now));

        Assert.Equal(
            new HighlightsLookupDocument("", "2026-03-01T18:00:00.0000000+00:00", "missing", ""),
            policy.BuildLookupResult(now, "", "missing", ""));
        Assert.Equal(
            new HighlightsLookupDocument("", "2026-03-01T18:00:00.0000000+00:00", string.Empty, string.Empty),
            policy.BuildLookupResult(now, null, null, null));
    }

    [Fact]
    public void Highlights_lookup_policy_does_not_consider_a_same_day_race_finished_before_race_start_time()
    {
        var policy = new RaceHighlightsLookupPolicy(TimeSpan.FromHours(6));
        var now = new DateTimeOffset(2026, 03, 01, 12, 00, 00, TimeSpan.Zero);

        var shouldLookup = policy.ShouldLookup(
            CreateWeekend(
                "race-start-not-reached",
                startDate: "2026-03-01",
                endDate: "2026-03-01",
                raceStartTime: "2026-03-01T14:00:00Z",
                highlightsLookupStatus: string.Empty),
            now);

        Assert.False(shouldLookup);
    }

    [Fact]
    public void Highlights_lookup_policy_respects_an_explicit_end_timestamp_without_rewriting_it()
    {
        var policy = new RaceHighlightsLookupPolicy(TimeSpan.FromHours(6));
        var now = new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero);

        var shouldLookup = policy.ShouldLookup(
            CreateWeekend(
                "explicit-end-timestamp",
                startDate: "2026-03-01",
                endDate: "2026-03-01T20:00:00Z",
                raceStartTime: null,
                highlightsLookupStatus: string.Empty),
            now);

        Assert.False(shouldLookup);
    }

    [Fact]
    public async Task Results_service_reads_the_calendar_once_uses_cached_results_and_persists_found_highlights()
    {
        var weekendRepository = new StubWeekendRepository(
        [
            CreateWeekend(
                "race-1",
                detailUrl: "https://www.formula1.com/en/racing/2026/australia",
                raceStartTime: "2026-03-01T14:00:00Z"),
        ]);
        var sourceClient = new StubResultsSourceClient(new Dictionary<string, string>
        {
            ["https://www.formula1.com/en/results/2026/races/race-1/australia/race-result"] =
                "<table><tbody><tr><td>1</td><td>4</td><td>Lando Norris</td></tr><tr><td>2</td><td>1</td><td>Max Verstappen</td></tr><tr><td>3</td><td>16</td><td>Charles Leclerc</td></tr></tbody></table>",
            ["https://www.formula1.com/en/results/2026/races/race-1/australia/qualifying"] =
                "<table><tbody><tr><td>1</td><td>81</td><td>Oscar Piastri</td></tr></tbody></table>",
        });
        var highlightsLookupService = new StubRaceHighlightsLookupService(
            shouldLookup: true,
            resolvedLookup: new HighlightsLookupDocument(
                "https://www.youtube.com/watch?v=skyf1-finished",
                "2026-03-01T15:00:00.000Z",
                "found",
                "feed"));
        var service = new ResultsService(
            weekendRepository,
            sourceClient,
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            highlightsLookupService,
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var firstPayload = await service.ReadAsync("race-1", CancellationToken.None);
        var secondPayload = await service.ReadAsync("race-1", CancellationToken.None);

        Assert.Equal(
            new OfficialResultsDocument(
                "nor",
                "ver",
                "lec",
                "pia",
                "finished",
                "https://www.youtube.com/watch?v=skyf1-finished"),
            firstPayload);
        Assert.Equal(firstPayload, secondPayload);
        Assert.Equal(2, sourceClient.RequestedUrls.Count);
        Assert.Equal(2, weekendRepository.ReadAllCalls);
        Assert.Equal(
            new HighlightsLookupDocument(
                "https://www.youtube.com/watch?v=skyf1-finished",
                "2026-03-01T15:00:00.000Z",
                "found",
                "feed"),
            weekendRepository.WrittenLookup);
        Assert.Equal("https://www.youtube.com/watch?v=skyf1-finished", weekendRepository.Documents.Single().HighlightsVideoUrl);
        Assert.Equal(1, highlightsLookupService.ResolveCalls);
    }

    [Fact]
    public async Task Results_service_uses_sprint_results_for_sprint_weekends_and_falls_back_to_persisted_highlights_on_lookup_failures()
    {
        var weekendRepository = new StubWeekendRepository(
        [
            CreateWeekend(
                "race-2",
                detailUrl: "https://www.formula1.com/en/racing/2026/china",
                isSprintWeekend: true,
                raceStartTime: "2026-03-01T14:00:00Z",
                highlightsVideoUrl: "https://www.youtube.com/watch?v=existing-skyf1"),
        ]);
        var sourceClient = new StubResultsSourceClient(new Dictionary<string, string>
        {
            ["https://www.formula1.com/en/results/2026/races/race-2/china/race-result"] =
                "<table><tbody><tr><td>1</td><td>4</td><td>Lando Norris</td></tr><tr><td>2</td><td>81</td><td>Oscar Piastri</td></tr><tr><td>3</td><td>16</td><td>Charles Leclerc</td></tr></tbody></table>",
            ["https://www.formula1.com/en/results/2026/races/race-2/china/sprint-results"] =
                "<table><tbody><tr><td>1</td><td>1</td><td>Max Verstappen</td></tr></tbody></table>",
        });
        var highlightsLookupService = new StubRaceHighlightsLookupService(shouldLookup: true, exception: new InvalidOperationException("youtube offline"));
        var service = new ResultsService(
            weekendRepository,
            sourceClient,
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            highlightsLookupService,
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var payload = await service.ReadAsync("race-2", CancellationToken.None);

        Assert.Equal(
            new OfficialResultsDocument(
                "nor",
                "pia",
                "lec",
                "ver",
                "finished",
                "https://www.youtube.com/watch?v=existing-skyf1"),
            payload);
        Assert.Contains(
            "https://www.formula1.com/en/results/2026/races/race-2/china/sprint-results",
            sourceClient.RequestedUrls);
        Assert.Null(weekendRepository.WrittenLookup);
    }

    [Fact]
    public async Task Results_service_degrades_individual_fetch_failures_to_empty_results_and_skips_lookup_for_non_finished_races()
    {
        var weekendRepository = new StubWeekendRepository(
        [
            CreateWeekend(
                "race-live",
                detailUrl: "https://www.formula1.com/en/racing/2026/live-gp",
                raceStartTime: "2026-03-01T14:00:00Z"),
        ]);
        var sourceClient = new StubResultsSourceClient();
        var highlightsLookupService = new StubRaceHighlightsLookupService(shouldLookup: true);
        var service = new ResultsService(
            weekendRepository,
            sourceClient,
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            highlightsLookupService,
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var payload = await service.ReadAsync("race-live", CancellationToken.None);

        Assert.Equal(
            new OfficialResultsDocument("", "", "", "", "live", string.Empty),
            payload);
        Assert.Equal(0, highlightsLookupService.ResolveCalls);
        Assert.Null(weekendRepository.WrittenLookup);
    }

    [Fact]
    public async Task Results_service_returns_empty_pole_when_the_bonus_source_is_unavailable()
    {
        var weekendRepository = new StubWeekendRepository(
        [
            CreateWeekend(
                "race-open",
                detailUrl: "https://www.formula1.com/en/racing/2026/open-gp",
                raceStartTime: "2026-03-02T14:00:00Z"),
        ]);
        var sourceClient = new StubResultsSourceClient(new Dictionary<string, string>
        {
            ["https://www.formula1.com/en/results/2026/races/race-open/open-gp/race-result"] =
                "<table><tbody><tr><td>1</td><td>4</td><td>Lando Norris</td></tr><tr><td>2</td><td>1</td><td>Max Verstappen</td></tr><tr><td>3</td><td>16</td><td>Charles Leclerc</td></tr></tbody></table>",
        });
        var service = new ResultsService(
            weekendRepository,
            sourceClient,
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            new StubRaceHighlightsLookupService(),
            new StubClock(new DateTimeOffset(2026, 03, 01, 10, 00, 00, TimeSpan.Zero)));

        var payload = await service.ReadAsync("race-open", CancellationToken.None);

        Assert.Equal("", payload.Pole);
        Assert.Equal("finished", payload.RacePhase);
    }

    [Fact]
    public async Task Results_service_catch_block_falls_back_to_persisted_highlights_when_lookup_throws()
    {
        // Covers the catch block at line 60 (race.HighlightsVideoUrl ?? string.Empty)
        // race has empty HighlightsVideoUrl so ShouldLookup returns true, exception fires in ResolveAsync
        var weekendRepository = new StubWeekendRepository(
        [
            CreateWeekend(
                "race-catch",
                detailUrl: "https://www.formula1.com/en/racing/2026/catch-gp",
                raceStartTime: "2026-03-01T14:00:00Z",
                highlightsVideoUrl: ""),
        ]);
        var sourceClient = new StubResultsSourceClient(new Dictionary<string, string>
        {
            ["https://www.formula1.com/en/results/2026/races/race-catch/catch-gp/race-result"] =
                "<table><tbody><tr><td>1</td><td>4</td><td>Lando Norris</td></tr><tr><td>2</td><td>1</td><td>Max Verstappen</td></tr><tr><td>3</td><td>16</td><td>Charles Leclerc</td></tr></tbody></table>",
            ["https://www.formula1.com/en/results/2026/races/race-catch/catch-gp/qualifying"] =
                "<table><tbody><tr><td>1</td><td>81</td><td>Oscar Piastri</td></tr></tbody></table>",
        });
        var highlightsLookupService = new StubRaceHighlightsLookupService(shouldLookup: true, exception: new InvalidOperationException("service unavailable"));
        var service = new ResultsService(
            weekendRepository,
            sourceClient,
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            highlightsLookupService,
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var payload = await service.ReadAsync("race-catch", CancellationToken.None);

        // Falls back to the original empty HighlightsVideoUrl
        Assert.Equal(string.Empty, payload.HighlightsVideoUrl);
        Assert.Equal("finished", payload.RacePhase);

        // Covers path 0 (null) of race.HighlightsVideoUrl ?? string.Empty in the catch block
        var weekendWithNullHighlights = new StubWeekendRepository(
        [
            CreateWeekend(
                "race-catch-null",
                detailUrl: "https://www.formula1.com/en/racing/2026/catch-gp",
                raceStartTime: "2026-03-01T14:00:00Z") with { HighlightsVideoUrl = null },
        ]);
        var serviceNullHighlights = new ResultsService(
            weekendWithNullHighlights,
            new StubResultsSourceClient(new Dictionary<string, string>
            {
                ["https://www.formula1.com/en/results/2026/races/race-catch-null/catch-gp/race-result"] =
                    "<table><tbody><tr><td>1</td><td>4</td><td>Lando Norris</td></tr><tr><td>2</td><td>1</td><td>Max Verstappen</td></tr><tr><td>3</td><td>16</td><td>Charles Leclerc</td></tr></tbody></table>",
                ["https://www.formula1.com/en/results/2026/races/race-catch-null/catch-gp/qualifying"] =
                    "<table><tbody><tr><td>1</td><td>81</td><td>Oscar Piastri</td></tr></tbody></table>",
            }),
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            new StubRaceHighlightsLookupService(shouldLookup: true, exception: new InvalidOperationException("null highlights")),
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var nullHighlightsPayload = await serviceNullHighlights.ReadAsync("race-catch-null", CancellationToken.None);
        Assert.Equal(string.Empty, nullHighlightsPayload.HighlightsVideoUrl);
    }

    [Fact]
    public async Task Results_service_throws_when_race_exists_but_has_no_detail_url()
    {
        var service = new ResultsService(
            new StubWeekendRepository([CreateWeekend("race-no-url", detailUrl: null)]),
            new StubResultsSourceClient(),
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            new StubRaceHighlightsLookupService(),
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.ReadAsync("race-no-url", CancellationToken.None));

        Assert.Equal("Race not found in calendar", exception.Message);
    }

    [Fact]
    public async Task Results_service_handles_cache_hit_when_race_is_missing_from_repository()
    {
        var cache = new RaceResultsCache();
        cache.Set("cached-race", new PredictionDocument(null!, null!, null!, null!));
        var service = new ResultsService(
            new StubWeekendRepository([]),
            new StubResultsSourceClient(),
            cache,
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            new StubRaceHighlightsLookupService(),
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var result = await service.ReadAsync("cached-race", CancellationToken.None);

        Assert.Equal(string.Empty, result.First);
        Assert.Equal(string.Empty, result.Second);
        Assert.Equal(string.Empty, result.Third);
        Assert.Equal(string.Empty, result.Pole);
        Assert.Equal(string.Empty, result.HighlightsVideoUrl);
        Assert.Equal("open", result.RacePhase);
    }

    [Fact]
    public async Task Results_service_throws_node_compatible_errors_for_missing_races_and_invalid_results_urls()
    {
        var service = new ResultsService(
            new StubWeekendRepository([]),
            new StubResultsSourceClient(),
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            new StubRaceHighlightsLookupService(),
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.ReadAsync("missing-race", CancellationToken.None));

        var brokenService = new ResultsService(
            new StubWeekendRepository(
            [
                CreateWeekend("broken-race", detailUrl: "https://www.formula1.com/en/results/2026/broken"),
            ]),
            new StubResultsSourceClient(),
            new RaceResultsCache(),
            new FormulaOneResultsUrlBuilder(),
            new OfficialResultsParser(),
            new RacePhaseResolver(),
            new StubRaceHighlightsLookupService(),
            new StubClock(new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => brokenService.ReadAsync("broken-race", CancellationToken.None));

        Assert.Equal("Race results URL could not be derived from calendar data", exception.Message);
    }

    private static WeekendDocument CreateWeekend(
        string meetingKey,
        string? detailUrl = null,
        bool isSprintWeekend = false,
        string? startDate = "2026-03-01",
        string? endDate = null,
        string? raceStartTime = null,
        string highlightsVideoUrl = "",
        string highlightsLookupCheckedAt = "",
        string highlightsLookupStatus = "",
        string highlightsLookupSource = "")
    {
        return new WeekendDocument(
            meetingKey,
            "Test GP",
            "FORMULA 1 TEST GP 2026",
            1,
            "01 - 03 MAR",
            detailUrl,
            null,
            null,
            isSprintWeekend,
            startDate,
            endDate,
            raceStartTime,
            [],
            highlightsVideoUrl,
            highlightsLookupCheckedAt,
            highlightsLookupStatus,
            highlightsLookupSource);
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class StubWeekendRepository : IWeekendRepository
    {
        public StubWeekendRepository(IReadOnlyList<WeekendDocument> documents)
        {
            Documents = documents.ToList();
        }

        public List<WeekendDocument> Documents { get; }

        public int ReadAllCalls { get; private set; }

        public HighlightsLookupDocument? WrittenLookup { get; private set; }

        public Task<WeekendDocument?> GetByIdAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<IReadOnlyList<WeekendDocument>> GetAllAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task UpdateAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task DeleteAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();

        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            ReadAllCalls += 1;
            return Task.FromResult<IReadOnlyList<WeekendDocument>>(Documents.ToArray());
        }

        public Task WriteAllAsync(IReadOnlyList<WeekendDocument> weekends, CancellationToken cancellationToken)
        {
            Documents.Clear();
            Documents.AddRange(weekends);
            return Task.CompletedTask;
        }

        public Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken)
        {
            WrittenLookup = lookup;

            for (var index = 0; index < Documents.Count; index += 1)
            {
                if (!string.Equals(Documents[index].MeetingKey, meetingKey, StringComparison.Ordinal))
                {
                    continue;
                }

                Documents[index] = Documents[index] with
                {
                    HighlightsVideoUrl = lookup.HighlightsVideoUrl,
                    HighlightsLookupCheckedAt = lookup.HighlightsLookupCheckedAt,
                    HighlightsLookupStatus = lookup.HighlightsLookupStatus,
                    HighlightsLookupSource = lookup.HighlightsLookupSource,
                };
            }

            return Task.CompletedTask;
        }
    }

    private sealed class StubResultsSourceClient : IResultsSourceClient
    {
        private readonly IReadOnlyDictionary<string, string> _htmlByUrl;

        public StubResultsSourceClient(IReadOnlyDictionary<string, string>? htmlByUrl = null)
        {
            _htmlByUrl = htmlByUrl ?? new Dictionary<string, string>();
        }

        public List<string> RequestedUrls { get; } = [];

        public Task<string> FetchHtmlAsync(string url, CancellationToken cancellationToken)
        {
            RequestedUrls.Add(url);
            if (_htmlByUrl.TryGetValue(url, out var html))
            {
                return Task.FromResult(html);
            }

            throw new InvalidOperationException($"Unknown URL {url}");
        }
    }

    private sealed class StubRaceHighlightsLookupService : IRaceHighlightsLookupService
    {
        private readonly HighlightsLookupDocument _resolvedLookup;
        private readonly Exception? _exception;

        public StubRaceHighlightsLookupService(
            bool shouldLookup = false,
            HighlightsLookupDocument? resolvedLookup = null,
            Exception? exception = null)
        {
            ShouldLookupResult = shouldLookup;
            _resolvedLookup = resolvedLookup ?? new HighlightsLookupDocument("", "", "", "");
            _exception = exception;
        }

        public bool ShouldLookupResult { get; }

        public int ResolveCalls { get; private set; }

        public bool ShouldLookup(WeekendDocument race, DateTimeOffset now)
        {
            return ShouldLookupResult && string.IsNullOrWhiteSpace(race.HighlightsVideoUrl);
        }

        public Task<HighlightsLookupDocument> ResolveAsync(WeekendDocument race, CancellationToken cancellationToken)
        {
            ResolveCalls += 1;
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_resolvedLookup);
        }
    }
}
