using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.Results;

namespace FantaF1.Infrastructure.Results;

public sealed class RaceHighlightsLookupService : IRaceHighlightsLookupService
{
    private static readonly Regex HtmlTagPattern = new(
        "<[^>]+>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex AnchorPattern = new(
        "<a[^>]+href=\"([^\"]+)\"[^>]*>([\\s\\S]*?)</a>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex EntryPattern = new(
        "<entry>([\\s\\S]*?)</entry>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));

    private readonly HttpClient _httpClient;
    private readonly IClock _clock;
    private readonly RaceHighlightsLookupPolicy _lookupPolicy;

    public RaceHighlightsLookupService(HttpClient httpClient, IClock clock)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _lookupPolicy = new RaceHighlightsLookupPolicy(TimeSpan.FromHours(OfficialResultsReferenceData.HighlightsLookupMissingTtlHours));
    }

    public bool ShouldLookup(WeekendDocument race, DateTimeOffset now)
    {
        return _lookupPolicy.ShouldLookup(race, now);
    }

    public async Task<HighlightsLookupDocument> ResolveAsync(WeekendDocument race, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(race);

        var now = _clock.UtcNow;
        var feedCandidates = await LoadFeedCandidatesAsync(cancellationToken);
        var feedCandidate = await ValidateCandidatesInOrderAsync(feedCandidates, race, cancellationToken);
        if (feedCandidate is not null)
        {
            return _lookupPolicy.BuildLookupResult(now, feedCandidate.VideoUrl, "found", "feed");
        }

        var channelSearchCandidates = await LoadMarkupCandidatesAsync(
            $"{OfficialResultsReferenceData.HighlightsChannelSearchBaseUrl}{Uri.EscapeDataString(BuildSearchQuery(race))}",
            "channel-search",
            "Sky Sport F1",
            $"https://www.youtube.com/{OfficialResultsReferenceData.HighlightsChannelHandle}",
            cancellationToken);
        var channelSearchCandidate = await ValidateCandidatesInOrderAsync(channelSearchCandidates, race, cancellationToken);
        if (channelSearchCandidate is not null)
        {
            return _lookupPolicy.BuildLookupResult(now, channelSearchCandidate.VideoUrl, "found", "channel-search");
        }

        var globalSearchCandidates = await LoadMarkupCandidatesAsync(
            $"{OfficialResultsReferenceData.HighlightsSearchBaseUrl}{Uri.EscapeDataString(BuildSearchQuery(race))}",
            "global-search",
            string.Empty,
            string.Empty,
            cancellationToken);
        var globalSearchCandidate = await ValidateCandidatesInOrderAsync(globalSearchCandidates, race, cancellationToken);
        if (globalSearchCandidate is not null)
        {
            return _lookupPolicy.BuildLookupResult(now, globalSearchCandidate.VideoUrl, "found", "global-search");
        }

        return _lookupPolicy.BuildLookupResult(now, string.Empty, "missing", string.Empty);
    }

    private async Task<IReadOnlyList<HighlightsCandidate>> LoadFeedCandidatesAsync(CancellationToken cancellationToken)
    {
        var feedXml = await FetchStringOrEmptyAsync(OfficialResultsReferenceData.HighlightsFeedUrl, cancellationToken);
        if (string.IsNullOrWhiteSpace(feedXml))
        {
            return [];
        }

        return EntryPattern.Matches(feedXml)
            .Select(match =>
            {
                var entry = match.Groups[1].Value;
                var videoId = ExtractBetween(entry, "<yt:videoId>", "</yt:videoId>");
                return new HighlightsCandidate(
                    NormalizeText(videoId),
                    NormalizeYoutubeWatchUrl($"/watch?v={videoId}"),
                    NormalizeText(ExtractBetween(entry, "<title>", "</title>")),
                    NormalizeText(ExtractBetween(entry, "<name>", "</name>")),
                    NormalizeText(ExtractBetween(entry, "<uri>", "</uri>")),
                    NormalizeText(ExtractBetween(entry, "<published>", "</published>")),
                    "feed");
            })
            .Where(candidate => !string.IsNullOrWhiteSpace(candidate.VideoUrl))
            .ToArray();
    }

    private async Task<IReadOnlyList<HighlightsCandidate>> LoadMarkupCandidatesAsync(
        string url,
        string source,
        string defaultAuthorName,
        string defaultAuthorUrl,
        CancellationToken cancellationToken)
    {
        var markup = await FetchStringOrEmptyAsync(url, cancellationToken);
        return string.IsNullOrWhiteSpace(markup)
            ? []
            : ExtractCandidatesFromMarkup(markup, source, defaultAuthorName, defaultAuthorUrl);
    }

    private async Task<HighlightsCandidate?> ValidateCandidatesInOrderAsync(
        IReadOnlyList<HighlightsCandidate> candidates,
        WeekendDocument race,
        CancellationToken cancellationToken)
    {
        foreach (var candidate in SortCandidates(candidates, race))
        {
            var validatedCandidate = await ValidateCandidateAsync(candidate, race, cancellationToken);
            if (validatedCandidate is not null)
            {
                return validatedCandidate;
            }
        }

        return null;
    }

    private async Task<HighlightsCandidate?> ValidateCandidateAsync(
        HighlightsCandidate candidate,
        WeekendDocument race,
        CancellationToken cancellationToken)
    {
        var oEmbedPayload = await FetchStringOrEmptyAsync(
            $"{OfficialResultsReferenceData.HighlightsOEmbedBaseUrl}{Uri.EscapeDataString(candidate.VideoUrl)}",
            cancellationToken);
        if (string.IsNullOrWhiteSpace(oEmbedPayload))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(oEmbedPayload);
            var root = document.RootElement;
            var validatedCandidate = candidate with
            {
                Title = ReadJsonString(root, "title") ?? candidate.Title,
                AuthorName = ReadJsonString(root, "author_name") ?? candidate.AuthorName,
                AuthorUrl = ReadJsonString(root, "author_url") ?? candidate.AuthorUrl,
            };

            return IsPublisherMatch($"{validatedCandidate.AuthorName} {validatedCandidate.AuthorUrl}")
                && double.IsFinite(BuildCandidateScore(validatedCandidate, race))
                ? validatedCandidate
                : null;
        }
        catch
        {
            return null;
        }
    }

    private IReadOnlyList<HighlightsCandidate> ExtractCandidatesFromMarkup(
        string rawContent,
        string source,
        string defaultAuthorName,
        string defaultAuthorUrl)
    {
        var jsonCandidates = ExtractJsonVideoRenderers(rawContent)
            .Select(renderer =>
            {
                var videoId = NormalizeText(ReadJsonString(renderer, "videoId") ?? ReadNestedWatchEndpointVideoId(renderer));
                var rawVideoUrl = ReadNestedWebMetadataUrl(renderer);
                var candidate = new HighlightsCandidate(
                    videoId,
                    NormalizeYoutubeWatchUrl(string.IsNullOrWhiteSpace(rawVideoUrl) && !string.IsNullOrWhiteSpace(videoId)
                        ? $"/watch?v={videoId}"
                        : rawVideoUrl),
                    ReadRendererText(renderer, "title") ?? string.Empty,
                    ReadRendererText(renderer, "longBylineText")
                        ?? ReadRendererText(renderer, "ownerText")
                        ?? ReadRendererText(renderer, "shortBylineText")
                        ?? defaultAuthorName,
                    defaultAuthorUrl,
                    string.Empty,
                    source);

                return candidate;
            })
            .Where(candidate => !string.IsNullOrWhiteSpace(candidate.VideoUrl))
            .ToArray();
        if (jsonCandidates.Length > 0)
        {
            return jsonCandidates;
        }

        return AnchorPattern.Matches(rawContent)
            .Select(match => new HighlightsCandidate(
                string.Empty,
                NormalizeYoutubeWatchUrl(match.Groups[1].Value),
                NormalizeText(match.Groups[2].Value),
                defaultAuthorName,
                defaultAuthorUrl,
                string.Empty,
                source))
            .Where(candidate => !string.IsNullOrWhiteSpace(candidate.VideoUrl))
            .ToArray();
    }

    private IReadOnlyList<HighlightsCandidate> SortCandidates(IReadOnlyList<HighlightsCandidate> candidates, WeekendDocument race)
    {
        return candidates
            .Select(candidate => new RankedHighlightsCandidate(candidate, BuildCandidateScore(candidate, race)))
            .Where(candidate => double.IsFinite(candidate.Score) && candidate.Score > 0)
            .OrderByDescending(candidate => candidate.Score)
            .ThenByDescending(candidate => ParsePublishedAt(candidate.Candidate.PublishedAt))
            .Select(candidate => candidate.Candidate)
            .ToArray();
    }

    private double BuildCandidateScore(HighlightsCandidate candidate, WeekendDocument race)
    {
        var title = NormalizeLookupText(candidate.Title);
        var author = NormalizeLookupText(candidate.AuthorName);
        var authorUrl = NormalizeLookupText(candidate.AuthorUrl);
        var combinedSource = $"{title} {author} {authorUrl}";
        var raceMatchTerms = BuildRaceMatchTerms(race);
        var seasonYear = DeriveSeasonYear(race);
        var candidateSeasonYear = ExtractSeasonYear(candidate.Title);

        if (string.Equals(candidate.Source, "global-search", StringComparison.Ordinal)
            && !IsPublisherMatch(combinedSource))
        {
            return double.NegativeInfinity;
        }

        if (!raceMatchTerms.Any(term => title.Contains(term, StringComparison.Ordinal)))
        {
            return double.NegativeInfinity;
        }

        if (!string.IsNullOrWhiteSpace(candidateSeasonYear)
            && !string.IsNullOrWhiteSpace(seasonYear)
            && !string.Equals(candidateSeasonYear, seasonYear, StringComparison.Ordinal))
        {
            return double.NegativeInfinity;
        }

        var score = 0d;
        if (OfficialResultsReferenceData.HighlightsPositiveKeywords.Any(keyword => title.Contains(NormalizeLookupText(keyword), StringComparison.Ordinal)))
        {
            score += 20;
        }

        if (HasRequiredKeyword(title))
        {
            score += 8;
        }

        if (OfficialResultsReferenceData.HighlightsSecondaryKeywords.Any(keyword => title.Contains(NormalizeLookupText(keyword), StringComparison.Ordinal)))
        {
            score += 6;
        }

        if (title.Contains("gp", StringComparison.Ordinal))
        {
            score += 3;
        }

        if (title.Contains("gara", StringComparison.Ordinal) || title.Contains("race", StringComparison.Ordinal))
        {
            score += 2;
        }

        if (!string.IsNullOrWhiteSpace(seasonYear) && title.Contains(seasonYear, StringComparison.Ordinal))
        {
            score += 4;
        }

        score += raceMatchTerms.Sum(term => title.Contains(term, StringComparison.Ordinal) ? 2 : 0);

        if (OfficialResultsReferenceData.HighlightsNegativeKeywords.Any(keyword => title.Contains(NormalizeLookupText(keyword), StringComparison.Ordinal)))
        {
            score -= 12;
        }

        var publishedAtValue = ParsePublishedAt(candidate.PublishedAt);
        var raceStartValue = ParseDate(race.StartDate) ?? ParseDate(race.EndDate);
        if (publishedAtValue.HasValue && raceStartValue.HasValue && publishedAtValue.Value >= raceStartValue.Value)
        {
            score += 1;
        }

        return score;
    }

    private static IEnumerable<string> BuildRaceMatchTerms(WeekendDocument race)
    {
        var terms = new HashSet<string>(StringComparer.Ordinal);
        var values = new[]
        {
            race.MeetingName,
            race.GrandPrixTitle,
            race.MeetingKey,
            race.DetailUrl?.Split('/').LastOrDefault(),
        };

        foreach (var value in values)
        {
            var normalizedValue = NormalizeLookupText(value);
            foreach (var token in TokenizeLookupTerms(value))
            {
                terms.Add(token);
            }

            foreach (var entry in OfficialResultsReferenceData.HighlightsRaceAliases)
            {
                if (string.IsNullOrWhiteSpace(normalizedValue)
                    || !normalizedValue.Contains(NormalizeLookupText(entry.Key), StringComparison.Ordinal))
                {
                    continue;
                }

                foreach (var token in TokenizeLookupTerms(entry.Key))
                {
                    terms.Add(token);
                }

                foreach (var alias in entry.Value)
                {
                    foreach (var token in TokenizeLookupTerms(alias))
                    {
                        terms.Add(token);
                    }
                }
            }
        }

        return terms;
    }

    private static string BuildSearchQuery(WeekendDocument race)
    {
        var titleSeed = NormalizeText(race.GrandPrixTitle ?? race.MeetingName ?? race.MeetingKey);
        var seasonYear = string.IsNullOrWhiteSpace(titleSeed) ? string.Empty : DeriveSeasonYear(race);
        return NormalizeText($"{titleSeed} {seasonYear} highlights {OfficialResultsReferenceData.HighlightsPublisherLabel}");
    }

    private static string DeriveSeasonYear(WeekendDocument race)
    {
        var detailMatch = Regex.Match(race.DetailUrl ?? string.Empty, "/racing/(\\d{4})/", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
        if (detailMatch.Success)
        {
            return detailMatch.Groups[1].Value;
        }

        return ExtractSeasonYear(race.GrandPrixTitle)
            ?? ExtractSeasonYear(race.MeetingName)
            ?? DateTime.UtcNow.Year.ToString(CultureInfo.InvariantCulture);
    }

    private static string? ExtractSeasonYear(string? value)
    {
        var match = Regex.Match(value ?? string.Empty, "\\b(20\\d{2})\\b", RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));
        return match.Success ? match.Groups[1].Value : null;
    }

    private static bool HasRequiredKeyword(string value)
    {
        return OfficialResultsReferenceData.HighlightsRequiredKeywords.Any(keyword => value.Contains(NormalizeLookupText(keyword), StringComparison.Ordinal));
    }

    private static bool IsPublisherMatch(string value)
    {
        var normalizedValue = NormalizeLookupText(value);
        return OfficialResultsReferenceData.HighlightsPublisherKeywords.Any(keyword => normalizedValue.Contains(NormalizeLookupText(keyword), StringComparison.Ordinal))
            || normalizedValue.Contains(NormalizeLookupText(OfficialResultsReferenceData.HighlightsChannelHandle), StringComparison.Ordinal)
            || normalizedValue.Contains(NormalizeLookupText(OfficialResultsReferenceData.HighlightsChannelId), StringComparison.Ordinal);
    }

    private async Task<string> FetchStringOrEmptyAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.TryAddWithoutValidation("user-agent", OfficialResultsReferenceData.BrowserUserAgent);
            request.Headers.TryAddWithoutValidation("accept-language", OfficialResultsReferenceData.BrowserAcceptLanguage);

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return string.Empty;
            }

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }
        catch
        {
            return string.Empty;
        }
    }

    private static IEnumerable<JsonElement> ExtractJsonVideoRenderers(string rawContent)
    {
        const string pattern = "{\"videoRenderer\":{";
        var renderers = new List<JsonElement>();

        for (var index = 0; index < rawContent.Length; index += 1)
        {
            var startIndex = rawContent.IndexOf(pattern, index, StringComparison.Ordinal);
            if (startIndex < 0)
            {
                break;
            }

            var endIndex = FindMatchingBraceIndex(rawContent, startIndex);
            if (endIndex < 0)
            {
                index = startIndex + pattern.Length;
                continue;
            }

            try
            {
                using var document = JsonDocument.Parse(rawContent[startIndex..(endIndex + 1)]);
                if (document.RootElement.TryGetProperty("videoRenderer", out var renderer))
                {
                    renderers.Add(renderer.Clone());
                }
            }
            catch
            {
                // Ignore malformed candidate blocks and continue scanning.
            }

            index = endIndex;
        }

        return renderers;
    }

    private static int FindMatchingBraceIndex(string value, int startIndex)
    {
        var depth = 0;
        var inString = false;
        var isEscaped = false;

        for (var index = startIndex; index < value.Length; index += 1)
        {
            var current = value[index];

            if (inString)
            {
                if (isEscaped)
                {
                    isEscaped = false;
                    continue;
                }

                if (current == '\\')
                {
                    isEscaped = true;
                    continue;
                }

                if (current == '"')
                {
                    inString = false;
                }

                continue;
            }

            if (current == '"')
            {
                inString = true;
                continue;
            }

            if (current == '{')
            {
                depth += 1;
                continue;
            }

            if (current == '}')
            {
                depth -= 1;
                if (depth == 0)
                {
                    return index;
                }
            }
        }

        return -1;
    }

    private static string? ReadNestedWatchEndpointVideoId(JsonElement renderer)
    {
        return renderer.TryGetProperty("navigationEndpoint", out var navigationEndpoint)
            && navigationEndpoint.TryGetProperty("watchEndpoint", out var watchEndpoint)
            && watchEndpoint.TryGetProperty("videoId", out var videoIdElement)
                ? videoIdElement.GetString()
                : null;
    }

    private static string? ReadNestedWebMetadataUrl(JsonElement renderer)
    {
        return renderer.TryGetProperty("navigationEndpoint", out var navigationEndpoint)
            && navigationEndpoint.TryGetProperty("commandMetadata", out var commandMetadata)
            && commandMetadata.TryGetProperty("webCommandMetadata", out var webMetadata)
            && webMetadata.TryGetProperty("url", out var urlElement)
                ? urlElement.GetString()
                : null;
    }

    private static string? ReadRendererText(JsonElement renderer, string propertyName)
    {
        if (!renderer.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        if (property.TryGetProperty("simpleText", out var simpleText))
        {
            return NormalizeText(simpleText.GetString());
        }

        if (property.TryGetProperty("runs", out var runs) && runs.ValueKind == JsonValueKind.Array)
        {
            var builder = new StringBuilder();
            foreach (var item in runs.EnumerateArray())
            {
                if (item.TryGetProperty("text", out var textValue))
                {
                    builder.Append(textValue.GetString());
                    builder.Append(' ');
                }
            }

            return NormalizeText(builder.ToString());
        }

        return null;
    }

    private static string? ReadJsonString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property)
            ? property.GetString()
            : null;
    }

    private static string ExtractBetween(string value, string start, string end)
    {
        var startIndex = value.IndexOf(start, StringComparison.OrdinalIgnoreCase);
        if (startIndex < 0)
        {
            return string.Empty;
        }

        startIndex += start.Length;
        var endIndex = value.IndexOf(end, startIndex, StringComparison.OrdinalIgnoreCase);
        return endIndex < 0 ? string.Empty : value[startIndex..endIndex];
    }

    private static string NormalizeYoutubeWatchUrl(string? href)
    {
        var value = (href ?? string.Empty).Trim();
        var watchMatch = Regex.Match(value, @"(?:https://www\.youtube\.com)?/watch\?v=([A-Za-z0-9_-]{6,})", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
        if (watchMatch.Success)
        {
            return $"https://www.youtube.com/watch?v={watchMatch.Groups[1].Value}";
        }

        var shortMatch = Regex.Match(value, @"(?:https://www\.youtube\.com)?/shorts/([A-Za-z0-9_-]{6,})", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
        return shortMatch.Success
            ? $"https://www.youtube.com/watch?v={shortMatch.Groups[1].Value}"
            : string.Empty;
    }

    private static string NormalizeText(string? value)
    {
        var withoutTags = HtmlTagPattern.Replace(value ?? string.Empty, " ");
        return Regex.Replace(WebUtility.HtmlDecode(withoutTags), "\\s+", " ").Trim();
    }

    private static string NormalizeLookupText(string? value)
    {
        var normalized = NormalizeText(value).Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (char.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(char.ToLowerInvariant(character));
            }
        }

        return builder.ToString();
    }

    private static IEnumerable<string> TokenizeLookupTerms(string? value)
    {
        return Regex.Split(NormalizeLookupText(value), "[^a-z0-9]+")
            .Where(token => token.Length >= 3
                && !token.All(char.IsDigit)
                && !string.Equals(token, "grand", StringComparison.Ordinal)
                && !string.Equals(token, "prix", StringComparison.Ordinal)
                && !string.Equals(token, "formula", StringComparison.Ordinal));
    }

    private static DateTimeOffset? ParseDate(string? value)
    {
        return DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsedValue)
            ? parsedValue
            : null;
    }

    private static DateTimeOffset? ParsePublishedAt(string? value)
    {
        return ParseDate(value);
    }

    private sealed record HighlightsCandidate(
        string VideoId,
        string VideoUrl,
        string Title,
        string AuthorName,
        string AuthorUrl,
        string PublishedAt,
        string Source);

    private sealed record RankedHighlightsCandidate(HighlightsCandidate Candidate, double Score);
}
