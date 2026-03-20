using System.Text.RegularExpressions;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Configuration;

namespace FantaF1.Infrastructure.Calendar;

public sealed partial class OfficialCalendarSyncService
{
    private static readonly IReadOnlyDictionary<string, int> MonthIndex = new Dictionary<string, int>(StringComparer.Ordinal)
    {
        ["JAN"] = 1,
        ["FEB"] = 2,
        ["MAR"] = 3,
        ["APR"] = 4,
        ["MAY"] = 5,
        ["JUN"] = 6,
        ["JUL"] = 7,
        ["AUG"] = 8,
        ["SEP"] = 9,
        ["OCT"] = 10,
        ["NOV"] = 11,
        ["DEC"] = 12,
    };

    private readonly PortingAppConfig _config;
    private readonly IWeekendRepository _weekendRepository;
    private readonly IRaceHighlightsLookupService _highlightsLookupService;
    private readonly IClock _clock;
    private readonly HttpClient _httpClient;

    public OfficialCalendarSyncService(
        PortingAppConfig config,
        IWeekendRepository weekendRepository,
        IRaceHighlightsLookupService highlightsLookupService,
        IClock clock,
        HttpClient httpClient)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _weekendRepository = weekendRepository ?? throw new ArgumentNullException(nameof(weekendRepository));
        _highlightsLookupService = highlightsLookupService ?? throw new ArgumentNullException(nameof(highlightsLookupService));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    }

    public async Task<IReadOnlyList<WeekendDocument>> SyncAsync(CancellationToken cancellationToken)
    {
        const int maxAttempts = 3;

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            try
            {
                var persistedWeekends = await _weekendRepository.ReadAllAsync(cancellationToken);
                var persistedWeekendsIndex = PersistedWeekendIndex.Create(persistedWeekends);
                var seasonHtml = await FetchHtmlAsync(_config.Calendar.SeasonUrl, cancellationToken);
                var baseCalendar = ParseSeasonCalendarPage(seasonHtml, _config.CurrentYear);

                if (baseCalendar.Count < _config.Calendar.ExpectedMinimumWeekends)
                {
                    throw new InvalidOperationException("Invalid calendar source");
                }

                var enrichedCalendar = new List<WeekendDocument>(baseCalendar.Count);
                foreach (var weekend in baseCalendar)
                {
                    var persistedWeekend = persistedWeekendsIndex.Find(weekend);
                    try
                    {
                        var detailHtml = await FetchHtmlAsync(weekend.DetailUrl!, cancellationToken);
                        var detailData = ParseRaceDetailPage(detailHtml, weekend.MeetingName!, weekend.MeetingKey, weekend.EndDate!);
                        var weekendWithDetail = BuildWeekendWithPersistedHighlights(
                            BuildWeekendWithDetailData(weekend, detailData),
                            persistedWeekendsIndex.Find(
                                detailData.MeetingKey,
                                weekend.DetailUrl,
                                weekend.MeetingKey,
                                weekend.RoundNumber,
                                weekend.StartDate,
                                weekend.EndDate) ?? persistedWeekend);

                        if (!_highlightsLookupService.ShouldLookup(weekendWithDetail, _clock.UtcNow))
                        {
                            enrichedCalendar.Add(BuildWeekendWithHighlightsFallback(weekendWithDetail));
                            continue;
                        }

                        try
                        {
                            var lookup = await _highlightsLookupService.ResolveAsync(weekendWithDetail, cancellationToken);
                            enrichedCalendar.Add(MergeLookupResult(weekendWithDetail, persistedWeekend, lookup));
                        }
                        catch
                        {
                            enrichedCalendar.Add(BuildWeekendWithHighlightsFallback(weekendWithDetail));
                        }
                    }
                    catch
                    {
                        enrichedCalendar.Add(BuildWeekendWithPersistedHighlights(weekend, persistedWeekend));
                    }
                }

                var normalizedCalendar = enrichedCalendar.OrderBy(weekend => weekend.RoundNumber ?? int.MaxValue).ToArray();
                await _weekendRepository.WriteAllAsync(normalizedCalendar, cancellationToken);
                return normalizedCalendar;
            }
            catch when (attempt < maxAttempts - 1)
            {
                await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
            }
            catch
            {
                break;
            }
        }

        return (await _weekendRepository.ReadAllAsync(cancellationToken))
            .OrderBy(weekend => weekend.RoundNumber ?? int.MaxValue)
            .ToArray();
    }

    internal async Task<string> FetchHtmlAsync(string url, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            throw new InvalidOperationException("Calendar detail URL is required");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("user-agent", _config.Calendar.UserAgent);
        request.Headers.TryAddWithoutValidation("accept-language", _config.Calendar.AcceptLanguage);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    internal IReadOnlyList<WeekendDocument> ParseSeasonCalendarPage(string rawContent, int year)
    {
        var raceMap = new Dictionary<string, WeekendDocument>(StringComparer.Ordinal);
        var anchorPattern = new Regex($"<a[^>]+href=\"(/en/racing/{year}/[^\"#?]+)\"[\\s\\S]*?</a>", RegexOptions.IgnoreCase);

        foreach (Match match in anchorPattern.Matches(rawContent ?? string.Empty))
        {
            var anchorHtml = match.Value;
            var href = match.Groups[1].Value;
            var slug = href.Split('/').LastOrDefault();
            if (string.IsNullOrWhiteSpace(slug) || slug.StartsWith("pre-season-testing", StringComparison.Ordinal))
            {
                continue;
            }

            var fragments = ExtractTextFragments(anchorHtml);
            var roundFragment = fragments.FirstOrDefault(fragment => Regex.IsMatch(fragment, "^ROUND\\s*\\d+$", RegexOptions.IgnoreCase));
            var roundMatch = roundFragment is null ? Match.Empty : Regex.Match(roundFragment, "ROUND\\s*(\\d+)", RegexOptions.IgnoreCase);
            if (!roundMatch.Success)
            {
                continue;
            }

            var roundNumber = int.Parse(roundMatch.Groups[1].Value);
            var dateFragment = fragments.FirstOrDefault(fragment =>
                Regex.IsMatch(NormalizeDateRangeLabel(fragment), "^(\\d{2}\\s*(?:[A-Za-z]{3}\\s*)?-\\s*\\d{2}\\s*[A-Za-z]{3})$", RegexOptions.IgnoreCase));
            var dateRangeLabel = NormalizeDateRangeLabel(dateFragment ?? string.Empty);
            var meetingName = fragments.FirstOrDefault(IsMeetingNameFragment) ?? string.Empty;
            var grandPrixTitle = fragments.FirstOrDefault(fragment => fragment.Contains("FORMULA 1", StringComparison.Ordinal))
                ?? $"{meetingName} Grand Prix {year}";
            var heroImageMatches = ImageSourcePattern().Matches(anchorHtml).Select(static image => image.Groups[1].Value).ToArray();
            var heroImageUrl = heroImageMatches.FirstOrDefault(image => image.Contains("/races/card/", StringComparison.Ordinal))
                ?? heroImageMatches.FirstOrDefault()
                ?? string.Empty;
            var (startDate, endDate) = ParseDateRangeLabel(dateRangeLabel, year);

            raceMap[slug] = new WeekendDocument(
                slug,
                meetingName,
                grandPrixTitle,
                roundNumber,
                dateRangeLabel,
                $"https://www.formula1.com{href}",
                heroImageUrl,
                string.Empty,
                false,
                startDate,
                endDate,
                null,
                [],
                string.Empty,
                string.Empty,
                string.Empty,
                string.Empty);
        }

        return raceMap.Values.OrderBy(weekend => weekend.RoundNumber ?? int.MaxValue).ToArray();
    }

    internal WeekendDocument ParseRaceDetailPage(string rawContent, string fallbackMeetingName, string fallbackSlug, string fallbackDate)
    {
        var titleMatch = Regex.Match(rawContent ?? string.Empty, "<title>([^<]+?) - F1 Race</title>", RegexOptions.IgnoreCase);
        var escapedSlug = Regex.Escape(fallbackSlug ?? string.Empty);
        var meetingKeyMatch = Regex.Match(rawContent ?? string.Empty, $"/results/\\d{{4}}/races/(\\d+)/{escapedSlug}(?:/|\")", RegexOptions.IgnoreCase);
        var sprintMatch = Regex.IsMatch(rawContent ?? string.Empty, $"/{escapedSlug}/(?:sprint-results|sprint-qualifying|sprint-shootout)", RegexOptions.IgnoreCase);
        var heroMatch = Regex.Match(rawContent ?? string.Empty, "<meta property=\"og:image\" content=\"([^\"]+)\"", RegexOptions.IgnoreCase);
        var trackMatch = Regex.Match(rawContent ?? string.Empty, "https://media\\.formula1\\.com/[^\"]*/common/f1/\\d{4}/track/[^\"]+\\.(?:webp|svg)", RegexOptions.IgnoreCase);

        var sessions = new List<WeekendSessionDocument>();
        var compactContent = Regex.Replace(rawContent ?? string.Empty, "\\s+", " ");
        var searchIndex = 0;
        while (true)
        {
            var typeIndex = compactContent.IndexOf("\"@type\":\"SportsEvent\"", searchIndex, StringComparison.OrdinalIgnoreCase);
            if (typeIndex < 0)
            {
                break;
            }

            var windowLength = Math.Min(1500, compactContent.Length - typeIndex);
            var searchArea = compactContent.Substring(typeIndex, windowLength);
            var nameMatch = Regex.Match(searchArea, "\"name\"\\s*:\\s*\"([^\"]+)\"", RegexOptions.IgnoreCase);
            var dateMatch = Regex.Match(searchArea, "\"startDate\"\\s*:\\s*\"([^\"]+)\"", RegexOptions.IgnoreCase);

            if (nameMatch.Success && dateMatch.Success)
            {
                var cleanName = nameMatch.Groups[1].Value.Split(" - ", StringSplitOptions.TrimEntries)[0];
                if (ValidSessionNames.Any(validName => cleanName.StartsWith(validName, StringComparison.Ordinal))
                    && sessions.All(session => !string.Equals(session.Name, cleanName, StringComparison.Ordinal)))
                {
                    sessions.Add(new WeekendSessionDocument(cleanName, dateMatch.Groups[1].Value));
                }
            }

            searchIndex = typeIndex + 1;
        }

        sessions.Sort((first, second) => string.CompareOrdinal(first.StartTime, second.StartTime));
        var raceStartTime = sessions.FirstOrDefault(session => session.Name!.Contains("Race", StringComparison.OrdinalIgnoreCase))?.StartTime;
        if (string.IsNullOrWhiteSpace(raceStartTime))
        {
            raceStartTime = Regex.Match(rawContent ?? string.Empty, "\"startDate\"\\s*:\\s*\"(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[^\"]*)\"", RegexOptions.IgnoreCase).Groups[1].Value;
        }

        if (string.IsNullOrWhiteSpace(raceStartTime) && !string.IsNullOrWhiteSpace(fallbackDate))
        {
            raceStartTime = $"{fallbackDate}T14:00:00Z";
        }

        return new WeekendDocument(
            meetingKeyMatch.Success ? meetingKeyMatch.Groups[1].Value : fallbackSlug ?? string.Empty,
            fallbackMeetingName,
            NormalizeText(titleMatch.Success ? titleMatch.Groups[1].Value : string.Empty) is { Length: > 0 } title ? title : $"{fallbackMeetingName} Grand Prix {_config.CurrentYear}",
            null,
            null,
            null,
            heroMatch.Success ? heroMatch.Groups[1].Value : string.Empty,
            trackMatch.Success ? trackMatch.Value : string.Empty,
            sprintMatch,
            null,
            fallbackDate,
            raceStartTime,
            sessions.Count > 0 ? sessions : [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty);
    }

    internal static (string StartDate, string EndDate) ParseDateRangeLabel(string dateRangeLabel, int year)
    {
        var normalized = NormalizeDateRangeLabel(dateRangeLabel);

        var sameMonthMatch = Regex.Match(normalized, "^(\\d{2}) - (\\d{2}) ([A-Z]{3})$");
        if (sameMonthMatch.Success)
        {
            return (
                BuildIsoDate(year, sameMonthMatch.Groups[3].Value, sameMonthMatch.Groups[1].Value),
                BuildIsoDate(year, sameMonthMatch.Groups[3].Value, sameMonthMatch.Groups[2].Value));
        }

        var splitMonthMatch = Regex.Match(normalized, "^(\\d{2}) ([A-Z]{3}) - (\\d{2}) ([A-Z]{3})$");
        if (splitMonthMatch.Success)
        {
            return (
                BuildIsoDate(year, splitMonthMatch.Groups[2].Value, splitMonthMatch.Groups[1].Value),
                BuildIsoDate(year, splitMonthMatch.Groups[4].Value, splitMonthMatch.Groups[3].Value));
        }

        var singleDayMatch = Regex.Match(normalized, "^(\\d{2}) ([A-Z]{3})$");
        if (singleDayMatch.Success)
        {
            var date = BuildIsoDate(year, singleDayMatch.Groups[2].Value, singleDayMatch.Groups[1].Value);
            return (date, date);
        }

        return (string.Empty, string.Empty);
    }

    internal static WeekendDocument BuildWeekendWithDetailData(WeekendDocument weekend, WeekendDocument detailData)
    {
        return weekend with
        {
            MeetingKey = detailData.MeetingKey,
            GrandPrixTitle = detailData.GrandPrixTitle,
            HeroImageUrl = string.IsNullOrWhiteSpace(detailData.HeroImageUrl) ? weekend.HeroImageUrl : detailData.HeroImageUrl,
            TrackOutlineUrl = string.IsNullOrWhiteSpace(detailData.TrackOutlineUrl) ? weekend.TrackOutlineUrl : detailData.TrackOutlineUrl,
            IsSprintWeekend = detailData.IsSprintWeekend,
            RaceStartTime = detailData.RaceStartTime,
            Sessions = detailData.Sessions,
        };
    }

    internal static WeekendDocument BuildWeekendWithHighlightsFallback(WeekendDocument weekend)
    {
        return weekend with
        {
            HighlightsVideoUrl = weekend.HighlightsVideoUrl ?? string.Empty,
            HighlightsLookupCheckedAt = weekend.HighlightsLookupCheckedAt ?? string.Empty,
            HighlightsLookupStatus = weekend.HighlightsLookupStatus ?? string.Empty,
            HighlightsLookupSource = weekend.HighlightsLookupSource ?? string.Empty,
        };
    }

    internal static WeekendDocument BuildWeekendWithPersistedHighlights(WeekendDocument weekend, WeekendDocument? persistedWeekend)
    {
        if (persistedWeekend is null)
        {
            return BuildWeekendWithHighlightsFallback(weekend);
        }

        return weekend with
        {
            HighlightsVideoUrl = persistedWeekend.HighlightsVideoUrl ?? string.Empty,
            HighlightsLookupCheckedAt = persistedWeekend.HighlightsLookupCheckedAt ?? string.Empty,
            HighlightsLookupStatus = persistedWeekend.HighlightsLookupStatus ?? string.Empty,
            HighlightsLookupSource = persistedWeekend.HighlightsLookupSource ?? string.Empty,
        };
    }

    internal static WeekendDocument MergeLookupResult(
        WeekendDocument weekend,
        WeekendDocument? persistedWeekend,
        HighlightsLookupDocument lookup)
    {
        var hasPersistedHighlights = !string.IsNullOrWhiteSpace(persistedWeekend?.HighlightsVideoUrl);
        var isMissingLookup = string.IsNullOrWhiteSpace(lookup.HighlightsVideoUrl)
            && string.Equals(lookup.HighlightsLookupStatus, "missing", StringComparison.Ordinal);

        if (hasPersistedHighlights && isMissingLookup)
        {
            return BuildWeekendWithPersistedHighlights(weekend, persistedWeekend);
        }

        return weekend with
        {
            HighlightsVideoUrl = lookup.HighlightsVideoUrl,
            HighlightsLookupCheckedAt = lookup.HighlightsLookupCheckedAt,
            HighlightsLookupStatus = lookup.HighlightsLookupStatus,
            HighlightsLookupSource = lookup.HighlightsLookupSource,
        };
    }

    internal static IEnumerable<string> ExtractTextFragments(string value)
    {
        return FragmentPattern().Matches(value ?? string.Empty)
            .Select(match => NormalizeText(match.Groups[1].Value))
            .Where(static fragment => !string.IsNullOrWhiteSpace(fragment));
    }

    private sealed class PersistedWeekendIndex
    {
        private readonly IReadOnlyDictionary<string, WeekendDocument> _byMeetingKey;
        private readonly IReadOnlyDictionary<string, WeekendDocument> _byDetailUrl;
        private readonly IReadOnlyDictionary<string, WeekendDocument> _bySlug;
        private readonly IReadOnlyDictionary<string, WeekendDocument> _byRoundAndDates;

        private PersistedWeekendIndex(
            IReadOnlyDictionary<string, WeekendDocument> byMeetingKey,
            IReadOnlyDictionary<string, WeekendDocument> byDetailUrl,
            IReadOnlyDictionary<string, WeekendDocument> bySlug,
            IReadOnlyDictionary<string, WeekendDocument> byRoundAndDates)
        {
            _byMeetingKey = byMeetingKey;
            _byDetailUrl = byDetailUrl;
            _bySlug = bySlug;
            _byRoundAndDates = byRoundAndDates;
        }

        public static PersistedWeekendIndex Create(IReadOnlyList<WeekendDocument> weekends)
        {
            var byMeetingKey = new Dictionary<string, WeekendDocument>(StringComparer.Ordinal);
            var byDetailUrl = new Dictionary<string, WeekendDocument>(StringComparer.Ordinal);
            var bySlug = new Dictionary<string, WeekendDocument>(StringComparer.OrdinalIgnoreCase);
            var byRoundAndDates = new Dictionary<string, WeekendDocument>(StringComparer.Ordinal);

            foreach (var weekend in weekends)
            {
                if (!string.IsNullOrWhiteSpace(weekend.MeetingKey))
                {
                    byMeetingKey[weekend.MeetingKey] = weekend;
                }

                if (!string.IsNullOrWhiteSpace(weekend.DetailUrl))
                {
                    byDetailUrl[weekend.DetailUrl] = weekend;
                }

                var slug = ExtractSlug(weekend.DetailUrl) ?? NormalizeKey(weekend.MeetingKey);
                if (!string.IsNullOrWhiteSpace(slug))
                {
                    bySlug[slug] = weekend;
                }

                var roundAndDatesKey = BuildRoundAndDatesKey(weekend.RoundNumber, weekend.StartDate, weekend.EndDate);
                if (!string.IsNullOrWhiteSpace(roundAndDatesKey))
                {
                    byRoundAndDates[roundAndDatesKey] = weekend;
                }
            }

            return new PersistedWeekendIndex(byMeetingKey, byDetailUrl, bySlug, byRoundAndDates);
        }

        public WeekendDocument? Find(WeekendDocument weekend)
        {
            return Find(weekend.MeetingKey, weekend.DetailUrl, weekend.MeetingKey, weekend.RoundNumber, weekend.StartDate, weekend.EndDate);
        }

        public WeekendDocument? Find(string? meetingKey, string? detailUrl, string? fallbackSlug)
        {
            return Find(meetingKey, detailUrl, fallbackSlug, null, null, null);
        }

        public WeekendDocument? Find(
            string? meetingKey,
            string? detailUrl,
            string? fallbackSlug,
            int? roundNumber,
            string? startDate,
            string? endDate)
        {
            var normalizedMeetingKey = NormalizeKey(meetingKey);
            if (!string.IsNullOrWhiteSpace(normalizedMeetingKey)
                && _byMeetingKey.TryGetValue(normalizedMeetingKey, out var weekendByMeetingKey))
            {
                return weekendByMeetingKey;
            }

            var normalizedDetailUrl = NormalizeKey(detailUrl);
            if (!string.IsNullOrWhiteSpace(normalizedDetailUrl)
                && _byDetailUrl.TryGetValue(normalizedDetailUrl, out var weekendByDetailUrl))
            {
                return weekendByDetailUrl;
            }

            var slug = ExtractSlug(detailUrl) ?? NormalizeKey(fallbackSlug);
            if (!string.IsNullOrWhiteSpace(slug) && _bySlug.TryGetValue(slug, out var weekendBySlug))
            {
                return weekendBySlug;
            }

            var roundAndDatesKey = BuildRoundAndDatesKey(roundNumber, startDate, endDate);
            return !string.IsNullOrWhiteSpace(roundAndDatesKey) && _byRoundAndDates.TryGetValue(roundAndDatesKey, out var weekendByRoundAndDates)
                ? weekendByRoundAndDates
                : null;
        }

        private static string? ExtractSlug(string? detailUrl)
        {
            return NormalizeKey(detailUrl?.Split('/').LastOrDefault());
        }

        private static string? NormalizeKey(string? value)
        {
            var normalizedValue = value?.Trim();
            return string.IsNullOrWhiteSpace(normalizedValue) ? null : normalizedValue;
        }

        private static string? BuildRoundAndDatesKey(int? roundNumber, string? startDate, string? endDate)
        {
            return roundNumber is null
                || string.IsNullOrWhiteSpace(startDate)
                || string.IsNullOrWhiteSpace(endDate)
                ? null
                : $"{roundNumber.Value}|{startDate.Trim()}|{endDate.Trim()}";
        }
    }

    internal static bool IsMeetingNameFragment(string fragment)
    {
        if (string.IsNullOrWhiteSpace(fragment))
        {
            return false;
        }

        var normalized = NormalizeDateRangeLabel(fragment);
        return !Regex.IsMatch(fragment, "^ROUND\\s*\\d+$", RegexOptions.IgnoreCase)
            && !Regex.IsMatch(fragment, "^(NEXT RACE|UPCOMING|CHEQUERED FLAG)$", RegexOptions.IgnoreCase)
            && !Regex.IsMatch(fragment, "^FLAG OF ", RegexOptions.IgnoreCase)
            && !Regex.IsMatch(normalized, "^(\\d{2}\\s*(?:[A-Za-z]{3}\\s*)?-\\s*\\d{2}\\s*[A-Za-z]{3})$", RegexOptions.IgnoreCase)
            && !Regex.IsMatch(fragment, "^\\d+(?:ST|ND|RD|TH)?$", RegexOptions.IgnoreCase)
            && !Regex.IsMatch(fragment, "^[A-Z]{3}$", RegexOptions.IgnoreCase)
            && !fragment.Contains("FORMULA 1", StringComparison.Ordinal);
    }

    internal static string NormalizeDateRangeLabel(string value)
    {
        return NormalizeText(value)
            .Replace(" - ", " - ", StringComparison.Ordinal)
            .ToUpperInvariant();
    }

    internal static string BuildIsoDate(int year, string monthLabel, string dayLabel)
    {
        return MonthIndex.TryGetValue(monthLabel[..3].ToUpperInvariant(), out var month)
            && int.TryParse(dayLabel, out var day)
                ? new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc).ToString("yyyy-MM-dd")
                : string.Empty;
    }

    internal static string NormalizeText(string value)
    {
        return Regex.Replace(Regex.Replace(value ?? string.Empty, "<[^>]+>", " "), "\\s+", " ").Trim();
    }

    private static readonly string[] ValidSessionNames =
    [
        "Practice 1",
        "Practice 2",
        "Practice 3",
        "Qualifying",
        "Sprint Shootout",
        "Sprint Qualifying",
        "Sprint",
        "Race",
    ];

    [GeneratedRegex("<img[^>]+src=\"([^\"]+)\"", RegexOptions.IgnoreCase)]
    private static partial Regex ImageSourcePattern();

    [GeneratedRegex(">([^<>]+)<", RegexOptions.IgnoreCase)]
    private static partial Regex FragmentPattern();
}
