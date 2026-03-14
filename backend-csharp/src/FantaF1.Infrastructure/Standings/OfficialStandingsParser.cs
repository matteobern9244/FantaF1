using System.Net;
using System.Text.RegularExpressions;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Infrastructure.Standings;

public sealed partial class OfficialStandingsParser : IStandingsParser
{
    public IReadOnlyList<DriverStandingDocument> ParseDriverStandings(
        string rawContent,
        IReadOnlyList<DriverDocument> drivers)
    {
        ArgumentNullException.ThrowIfNull(drivers);

        var driversByName = drivers.ToDictionary(
            static driver => NormalizeDriverName(driver.Name),
            static driver => driver,
            StringComparer.Ordinal);

        return ParseStandingsRows(rawContent)
            .Select(row =>
            {
                var rawName = row.Cells[1];
                var rawTeam = row.Cells[2];
                var normalizedName = NormalizeDriverName(rawName);
                driversByName.TryGetValue(normalizedName, out var driver);
                var normalizedTeam = NormalizeTeamName(driver?.Team ?? rawTeam);

                return new DriverStandingDocument(
                    row.Position,
                    driver?.Id ?? string.Empty,
                    normalizedName,
                    normalizedTeam,
                    row.Points,
                    driver?.AvatarUrl ?? string.Empty,
                    driver?.Color
                        ?? OfficialStandingsReferenceData.TeamColors.GetValueOrDefault(normalizedTeam)
                        ?? OfficialStandingsReferenceData.TeamColors["default"]);
            })
            .ToArray();
    }

    public IReadOnlyList<ConstructorStandingDocument> ParseConstructorStandings(string rawContent)
    {
        return ParseStandingsRows(rawContent)
            .Select(row =>
            {
                var team = NormalizeTeamName(row.Cells[1]);

                return new ConstructorStandingDocument(
                    row.Position,
                    team,
                    row.Points,
                    OfficialStandingsReferenceData.TeamColors.GetValueOrDefault(team)
                        ?? OfficialStandingsReferenceData.TeamColors["default"],
                    OfficialStandingsReferenceData.TeamLogoUrls.GetValueOrDefault(team) ?? string.Empty);
            })
            .ToArray();
    }

    private static IReadOnlyList<StandingsRow> ParseStandingsRows(string rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            return [];
        }

        var rows = new List<StandingsRow>();
        foreach (Match match in TableRowRegex().Matches(rawContent))
        {
            var rowHtml = match.Value;
            var cells = TableCellRegex().Matches(rowHtml)
                .Select(cellMatch => NormalizeText(cellMatch.Groups[1].Value))
                .ToArray();

            if (cells.Length < 3)
            {
                continue;
            }

            if (!int.TryParse(cells[0], out var position) || !int.TryParse(cells[^1], out var points))
            {
                continue;
            }

            rows.Add(new StandingsRow(position, cells, points));
        }

        return rows;
    }

    private static string NormalizeDriverName(string? name)
    {
        return ThreeLetterCodeSuffixRegex().Replace(NormalizeText(name), string.Empty).Trim();
    }

    private static string NormalizeTeamName(string? team)
    {
        var normalizedTeam = NormalizeText(team);
        return OfficialStandingsReferenceData.TeamAliases.GetValueOrDefault(normalizedTeam) ?? normalizedTeam;
    }

    private static string NormalizeText(string? value)
    {
        return CollapseWhitespaceRegex()
            .Replace(
                WebUtility.HtmlDecode(TagRegex().Replace(value ?? string.Empty, " "))
                    .Replace('\u00A0', ' '),
                " ")
            .Trim();
    }

    [GeneratedRegex(@"<tr\b[\s\S]*?<\/tr>", RegexOptions.IgnoreCase)]
    private static partial Regex TableRowRegex();

    [GeneratedRegex(@"<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>", RegexOptions.IgnoreCase)]
    private static partial Regex TableCellRegex();

    [GeneratedRegex(@"<[^>]+>", RegexOptions.IgnoreCase)]
    private static partial Regex TagRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex CollapseWhitespaceRegex();

    [GeneratedRegex(@"\b[A-Z]{3}\b$")]
    private static partial Regex ThreeLetterCodeSuffixRegex();

    private sealed record StandingsRow(int Position, IReadOnlyList<string> Cells, int Points);
}
