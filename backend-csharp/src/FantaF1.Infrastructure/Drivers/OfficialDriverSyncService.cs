using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Configuration;

namespace FantaF1.Infrastructure.Drivers;

public sealed partial class OfficialDriverSyncService
{
    private readonly PortingAppConfig _config;
    private readonly IDriverRepository _driverRepository;
    private readonly HttpClient _httpClient;

    public OfficialDriverSyncService(
        PortingAppConfig config,
        IDriverRepository driverRepository,
        HttpClient httpClient)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _driverRepository = driverRepository ?? throw new ArgumentNullException(nameof(driverRepository));
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    }

    public async Task<IReadOnlyList<DriverDocument>> SyncAsync(CancellationToken cancellationToken)
    {
        var formulaOneTask = TryFetchHtmlAsync(_config.Drivers.FormulaOneDriversUrl, cancellationToken);

        try
        {
            var statsHtml = await FetchHtmlAsync(_config.Drivers.StatsUrl, cancellationToken);
            var formulaOneHtml = await formulaOneTask;
            var formulaOneData = string.IsNullOrWhiteSpace(formulaOneHtml)
                ? new Dictionary<string, (string AvatarUrl, string TeamSlug)>(StringComparer.Ordinal)
                : ParseFormulaOneDriversPage(formulaOneHtml);
            var drivers = NormalizeDrivers(statsHtml, formulaOneData);

            if (drivers.Count < _config.Drivers.ExpectedCount)
            {
                throw new InvalidOperationException("Invalid driver source");
            }

            await _driverRepository.WriteAllAsync(drivers, cancellationToken);
            return drivers;
        }
        catch
        {
            var formulaOneHtml = await formulaOneTask;
            if (!string.IsNullOrWhiteSpace(formulaOneHtml))
            {
                var fallbackDrivers = BuildFormulaOneFallbackDrivers(formulaOneHtml);
                if (fallbackDrivers.Count >= _config.Drivers.ExpectedCount)
                {
                    await _driverRepository.WriteAllAsync(fallbackDrivers, cancellationToken);
                    return fallbackDrivers;
                }
            }

            var cachedDrivers = await _driverRepository.ReadAllAsync(cancellationToken);
            return SortDriversAlphabetically(cachedDrivers);
        }
    }

    private async Task<string> FetchHtmlAsync(string url, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("user-agent", _config.Drivers.UserAgent);
        request.Headers.TryAddWithoutValidation("accept-language", _config.Drivers.AcceptLanguage);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    private async Task<string> TryFetchHtmlAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            return await FetchHtmlAsync(url, cancellationToken);
        }
        catch
        {
            return string.Empty;
        }
    }

    internal IReadOnlyList<DriverDocument> NormalizeDrivers(
        string rawContent,
        IReadOnlyDictionary<string, (string AvatarUrl, string TeamSlug)> formulaOneData)
    {
        var existingIds = new HashSet<string>(StringComparer.Ordinal);
        var driverMap = new Dictionary<string, DriverDocument>(StringComparer.Ordinal);

        foreach (var parsedDriver in ParseStatsSeasonDriversHtml(rawContent))
        {
            formulaOneData.TryGetValue(parsedDriver.Name, out var mediaData);
            var driver = BuildDriverRecord(parsedDriver.Name, parsedDriver.Team, existingIds, mediaData.AvatarUrl, mediaData.TeamSlug);
            driverMap[driver.Id] = driver;
        }

        return SortDriversAlphabetically(driverMap.Values);
    }

    internal IReadOnlyList<DriverDocument> BuildFormulaOneFallbackDrivers(string rawContent)
    {
        var formulaOneDrivers = ParseFormulaOneDriversPage(rawContent);
        var existingIds = new HashSet<string>(StringComparer.Ordinal);
        var drivers = formulaOneDrivers
            .Select(pair =>
            {
                var teamName = _config.Drivers.TeamSlugNames.TryGetValue(pair.Value.TeamSlug, out var resolvedTeam)
                    ? resolvedTeam
                    : pair.Value.TeamSlug;

                return string.IsNullOrWhiteSpace(teamName)
                    ? null
                    : BuildDriverRecord(pair.Key, teamName, existingIds, pair.Value.AvatarUrl, pair.Value.TeamSlug);
            })
            .OfType<DriverDocument>()
            .ToArray();

        return SortDriversAlphabetically(drivers);
    }

    internal IEnumerable<(string Name, string Team)> ParseStatsSeasonDriversHtml(string rawContent)
    {
        var tableContent = StatsTablePattern().Match(rawContent ?? string.Empty).Groups[1].Value;
        var source = string.IsNullOrWhiteSpace(tableContent) ? rawContent ?? string.Empty : tableContent;

        foreach (Match rowMatch in TableRowPattern().Matches(source))
        {
            var rowHtml = rowMatch.Value;
            var nameMatch = StatsDriverPattern().Match(rowHtml);
            var cellValues = TableCellPattern()
                .Matches(rowHtml)
                .Select(match => NormalizeText(match.Groups[1].Value))
                .Where(static value => !string.IsNullOrWhiteSpace(value))
                .ToArray();

            var team = FindKnownTeam(cellValues);
            if (!nameMatch.Success || string.IsNullOrWhiteSpace(team))
            {
                continue;
            }

            yield return (CanonicalizeDriverName(nameMatch.Groups[1].Value), CanonicalizeTeamName(team));
        }
    }

    internal Dictionary<string, (string AvatarUrl, string TeamSlug)> ParseFormulaOneDriversPage(string rawContent)
    {
        var drivers = new Dictionary<string, (string AvatarUrl, string TeamSlug)>(StringComparer.Ordinal);

        foreach (Match match in FormulaOneDriverCardPattern().Matches(rawContent ?? string.Empty))
        {
            var avatarUrl = match.Groups[2].Value;
            var normalizedName = CanonicalizeDriverName($"{match.Groups[3].Value} {match.Groups[4].Value}");
            var teamSlugMatch = TeamSlugPattern().Match(avatarUrl);
            var teamSlug = teamSlugMatch.Success ? teamSlugMatch.Groups[1].Value.ToLowerInvariant() : string.Empty;
            drivers[normalizedName] = (avatarUrl, teamSlug);
        }

        return drivers;
    }

    internal DriverDocument BuildDriverRecord(
        string name,
        string team,
        HashSet<string> existingIds,
        string? avatarUrl = null,
        string? teamSlug = null)
    {
        var normalizedName = CanonicalizeDriverName(name);
        var normalizedTeam = CanonicalizeTeamName(team);
        var id = _config.Drivers.DriverIdOverrides.TryGetValue(normalizedName, out var overrideId)
            ? overrideId
            : GenerateFallbackId(normalizedName, existingIds);

        existingIds.Add(id);

        _config.Drivers.TeamColors.TryGetValue(normalizedTeam, out var color);

        return new DriverDocument(
            id,
            normalizedName,
            normalizedTeam,
            color ?? (_config.Drivers.TeamColors.TryGetValue("default", out var defaultColor) ? defaultColor : string.Empty),
            string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl,
            string.IsNullOrWhiteSpace(teamSlug) ? null : teamSlug);
    }

    private IReadOnlyList<DriverDocument> SortDriversAlphabetically(IEnumerable<DriverDocument> drivers)
    {
        var culture = new CultureInfo(_config.Drivers.SortLocale);
        return drivers
            .OrderBy(driver => driver.Name, StringComparer.Create(culture, ignoreCase: true))
            .ToArray();
    }

    internal string FindKnownTeam(IEnumerable<string> cellValues)
    {
        foreach (var cell in cellValues)
        {
            var normalizedCandidate = CanonicalizeTeamName(cell);
            if (_config.Drivers.TeamColors.ContainsKey(normalizedCandidate))
            {
                return normalizedCandidate;
            }
        }

        return string.Empty;
    }

    internal string CanonicalizeDriverName(string value)
    {
        var normalized = ToNameCase(value);
        return _config.Drivers.DriverAliases.TryGetValue(normalized, out var alias)
            ? alias
            : normalized;
    }

    internal string CanonicalizeTeamName(string value)
    {
        var normalized = NormalizeText(value);
        return _config.Drivers.TeamAliases.TryGetValue(normalized, out var alias)
            ? alias
            : normalized;
    }

    internal static string GenerateFallbackId(string name, HashSet<string> existingIds)
    {
        var normalizedName = Slugify(name);
        var nameParts = normalizedName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var baseToken = (nameParts.LastOrDefault() ?? normalizedName);
        baseToken = (baseToken.Length >= 3 ? baseToken[..3] : baseToken.PadRight(3, 'x')).ToLowerInvariant();
        var candidateId = baseToken;
        var collisionIndex = 1;

        while (existingIds.Contains(candidateId))
        {
            candidateId = $"{baseToken[..2]}{collisionIndex}";
            collisionIndex += 1;
        }

        return candidateId;
    }

    internal static string Slugify(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new System.Text.StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            if (char.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            builder.Append(character);
        }

        return NonSlugCharacterPattern().Replace(NormalizeText(builder.ToString()).ToLowerInvariant(), " ")
            .Trim();
    }

    internal static string ToNameCase(string value)
    {
        return string.Join(
            ' ',
            NormalizeText(value)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(part => string.Join(
                    '-',
                    part.Split('-', StringSplitOptions.TrimEntries)
                        .Select(token => token.Length == 0
                            ? string.Empty
                            : $"{char.ToUpperInvariant(token[0])}{token[1..].ToLowerInvariant()}"))));
    }

    internal static string NormalizeText(string value)
    {
        var withoutTags = TagPattern().Replace(value ?? string.Empty, " ");
        return HtmlEntityPattern().Replace(withoutTags, match => match.Value switch
        {
            "&amp;" => "&",
            "&quot;" => "\"",
            "&#39;" => "'",
            "&#x27;" => "'",
            "&nbsp;" => " ",
            "&egrave;" => "e",
            "&agrave;" => "a",
            _ => match.Value,
        }).Replace("\r", " ").Replace("\n", " ").Trim();
    }

    [GeneratedRegex("<table[^>]+id=\"ctl00_CPH_Main_GV_Entry\"[\\s\\S]*?<tbody>([\\s\\S]*?)</tbody>", RegexOptions.IgnoreCase)]
    private static partial Regex StatsTablePattern();

    [GeneratedRegex("<tr\\b[\\s\\S]*?</tr>", RegexOptions.IgnoreCase)]
    private static partial Regex TableRowPattern();

    [GeneratedRegex("class=\"Cur(?:Chp)?Driver\"[^>]*>([\\s\\S]*?)</span>", RegexOptions.IgnoreCase)]
    private static partial Regex StatsDriverPattern();

    [GeneratedRegex("<td\\b[^>]*>([\\s\\S]*?)</td>", RegexOptions.IgnoreCase)]
    private static partial Regex TableCellPattern();

    [GeneratedRegex("href=\"/en/drivers/([^\"]+)\"[\\s\\S]*?<img src=\"([^\"]+)\"[\\s\\S]*?<span class=\"typography-module_body-m-compact-regular__[^\"]*\">([^<]+)</span>\\s*<span class=\"typography-module_body-m-compact-bold__[^\"]*\">([^<]+)</span>", RegexOptions.IgnoreCase)]
    private static partial Regex FormulaOneDriverCardPattern();

    [GeneratedRegex("/common/f1/\\d{4}/([^/]+)/", RegexOptions.IgnoreCase)]
    private static partial Regex TeamSlugPattern();

    [GeneratedRegex("<[^>]+>", RegexOptions.IgnoreCase)]
    private static partial Regex TagPattern();

    [GeneratedRegex("&amp;|&quot;|&#39;|&#x27;|&nbsp;|&egrave;|&agrave;", RegexOptions.IgnoreCase)]
    private static partial Regex HtmlEntityPattern();

    [GeneratedRegex("[^a-z0-9\\s-]", RegexOptions.IgnoreCase)]
    private static partial Regex NonSlugCharacterPattern();
}
