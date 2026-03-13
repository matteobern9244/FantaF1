using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.Results;

namespace FantaF1.Application.Services;

public sealed class ResultsService : IResultsService
{
    private readonly IWeekendRepository _weekendRepository;
    private readonly IResultsSourceClient _resultsSourceClient;
    private readonly RaceResultsCache _cache;
    private readonly FormulaOneResultsUrlBuilder _urlBuilder;
    private readonly OfficialResultsParser _parser;
    private readonly RacePhaseResolver _racePhaseResolver;
    private readonly IRaceHighlightsLookupService _raceHighlightsLookupService;
    private readonly IClock _clock;

    public ResultsService(
        IWeekendRepository weekendRepository,
        IResultsSourceClient resultsSourceClient,
        RaceResultsCache cache,
        FormulaOneResultsUrlBuilder urlBuilder,
        OfficialResultsParser parser,
        RacePhaseResolver racePhaseResolver,
        IRaceHighlightsLookupService raceHighlightsLookupService,
        IClock clock)
    {
        _weekendRepository = weekendRepository ?? throw new ArgumentNullException(nameof(weekendRepository));
        _resultsSourceClient = resultsSourceClient ?? throw new ArgumentNullException(nameof(resultsSourceClient));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _urlBuilder = urlBuilder ?? throw new ArgumentNullException(nameof(urlBuilder));
        _parser = parser ?? throw new ArgumentNullException(nameof(parser));
        _racePhaseResolver = racePhaseResolver ?? throw new ArgumentNullException(nameof(racePhaseResolver));
        _raceHighlightsLookupService = raceHighlightsLookupService ?? throw new ArgumentNullException(nameof(raceHighlightsLookupService));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public async Task<OfficialResultsDocument> ReadAsync(string meetingKey, CancellationToken cancellationToken)
    {
        var weekends = await _weekendRepository.ReadAllAsync(cancellationToken);
        var race = weekends.FirstOrDefault(entry => string.Equals(entry.MeetingKey, meetingKey, StringComparison.Ordinal));
        var results = await ReadResultsAsync(race, meetingKey, cancellationToken);
        var racePhase = _racePhaseResolver.Resolve(race, results, _clock.UtcNow);
        var highlightsVideoUrl = (race?.HighlightsVideoUrl ?? string.Empty).Trim();

        if (string.Equals(racePhase, "finished", StringComparison.Ordinal)
            && race is not null
            && _raceHighlightsLookupService.ShouldLookup(race, _clock.UtcNow))
        {
            try
            {
                var lookup = await _raceHighlightsLookupService.ResolveAsync(race, cancellationToken);
                highlightsVideoUrl = lookup.HighlightsVideoUrl;
                await _weekendRepository.WriteHighlightsLookupAsync(meetingKey, lookup, cancellationToken);
            }
            catch
            {
                highlightsVideoUrl = (race.HighlightsVideoUrl ?? string.Empty).Trim();
            }
        }

        return new OfficialResultsDocument(
            results.First ?? string.Empty,
            results.Second ?? string.Empty,
            results.Third ?? string.Empty,
            results.Pole ?? string.Empty,
            racePhase,
            highlightsVideoUrl);
    }

    private async Task<PredictionDocument> ReadResultsAsync(WeekendDocument? race, string meetingKey, CancellationToken cancellationToken)
    {
        var cachedResults = _cache.Get(meetingKey);
        if (cachedResults is not null)
        {
            return cachedResults;
        }

        if (race is null || string.IsNullOrWhiteSpace(race.DetailUrl))
        {
            throw new InvalidOperationException("Race not found in calendar");
        }

        var resultsBaseUrl = _urlBuilder.Build(race.DetailUrl, race.MeetingKey);
        if (string.IsNullOrWhiteSpace(resultsBaseUrl))
        {
            throw new InvalidOperationException("Race results URL could not be derived from calendar data");
        }

        var raceUrl = $"{resultsBaseUrl}/race-result";
        var poleUrl = race.IsSprintWeekend
            ? $"{resultsBaseUrl}/sprint-results"
            : $"{resultsBaseUrl}/qualifying";

        var raceTask = TryFetchHtmlAsync(raceUrl, cancellationToken);
        var poleTask = TryFetchHtmlAsync(poleUrl, cancellationToken);
        await Task.WhenAll(raceTask, poleTask);

        var raceResults = _parser.ParseRaceClassification(raceTask.Result);
        var pole = string.IsNullOrWhiteSpace(poleTask.Result)
            ? string.Empty
            : _parser.ParseBonusDriver(poleTask.Result);
        var parsedResults = new PredictionDocument(
            raceResults.First,
            raceResults.Second,
            raceResults.Third,
            pole);

        return _cache.Set(meetingKey, parsedResults);
    }

    private async Task<string> TryFetchHtmlAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            return await _resultsSourceClient.FetchHtmlAsync(url, cancellationToken);
        }
        catch
        {
            return string.Empty;
        }
    }
}
