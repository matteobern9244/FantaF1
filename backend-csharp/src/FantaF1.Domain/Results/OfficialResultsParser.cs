using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Domain.Results;

public sealed class OfficialResultsParser
{
    private static readonly Regex TableWithClassPattern = new(
        "<table[^>]*class=\"[^\"]*Table-module_table[^\"]*\"[^>]*>[\\s\\S]*?</table>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex GenericTablePattern = new(
        "<table[^>]*>[\\s\\S]*?</table>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex TableBodyPattern = new(
        "<tbody[^>]*>([\\s\\S]*?)</tbody>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex TableRowPattern = new(
        "<tr\\b[^>]*>([\\s\\S]*?)</tr>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex TableCellPattern = new(
        "<td\\b[^>]*>([\\s\\S]*?)</td>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex HtmlTagPattern = new(
        "<[^>]+>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));
    private static readonly Regex TrailingAbbreviationPattern = new(
        "\\b([A-Z]{3})\\b$",
        RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));

    public PredictionDocument ParseRaceClassification(string? rawContent)
    {
        var orderedDrivers = ParseOrderedDrivers(rawContent, 3);

        return new PredictionDocument(
            orderedDrivers[0],
            orderedDrivers[1],
            orderedDrivers[2],
            null);
    }

    public string ParseBonusDriver(string? rawContent)
    {
        return ParseOrderedDrivers(rawContent, 1)[0];
    }

    private IReadOnlyList<string> ParseOrderedDrivers(string? rawContent, int maxPosition)
    {
        var tableHtml = ExtractResultsTable(rawContent);
        if (string.IsNullOrEmpty(tableHtml))
        {
            return Enumerable.Repeat(string.Empty, maxPosition).ToArray();
        }

        var orderedDrivers = Enumerable.Repeat(string.Empty, maxPosition).ToArray();
        foreach (var rowHtml in ExtractTableRows(tableHtml))
        {
            var cells = ExtractTableCells(rowHtml);
            if (cells.Count < 3)
            {
                continue;
            }

            if (!int.TryParse(NormalizeText(cells[0]), NumberStyles.Integer, CultureInfo.InvariantCulture, out var position)
                || position < 1
                || position > maxPosition)
            {
                continue;
            }

            var driverId = ResolveDriverId(cells[2]);
            if (string.IsNullOrEmpty(driverId))
            {
                continue;
            }

            orderedDrivers[position - 1] = driverId;
        }

        return orderedDrivers;
    }

    private static string ExtractResultsTable(string? rawContent)
    {
        var content = rawContent ?? string.Empty;
        if (content.Contains("No results available", StringComparison.OrdinalIgnoreCase))
        {
            return string.Empty;
        }

        var specificMatch = TableWithClassPattern.Match(content);
        if (specificMatch.Success)
        {
            return specificMatch.Value;
        }

        var genericMatch = GenericTablePattern.Match(content);
        return genericMatch.Success ? genericMatch.Value : string.Empty;
    }

    private static IReadOnlyList<string> ExtractTableRows(string tableHtml)
    {
        var tbodyMatch = TableBodyPattern.Match(tableHtml);
        var content = tbodyMatch.Success ? tbodyMatch.Groups[1].Value : tableHtml;

        return TableRowPattern.Matches(content)
            .Select(match => match.Value)
            .ToArray();
    }

    private static IReadOnlyList<string> ExtractTableCells(string rowHtml)
    {
        return TableCellPattern.Matches(rowHtml)
            .Select(match => match.Groups[1].Value)
            .ToArray();
    }

    private static string ResolveDriverId(string cellHtml)
    {
        var normalizedCellText = NormalizeText(cellHtml);
        var abbreviationMatch = TrailingAbbreviationPattern.Match(normalizedCellText);
        if (abbreviationMatch.Success)
        {
            return abbreviationMatch.Groups[1].Value.ToLowerInvariant();
        }

        var canonicalName = CanonicalizeDriverName(TrailingAbbreviationPattern.Replace(normalizedCellText, string.Empty).Trim());
        return OfficialResultsDriverReferenceData.DriverIdOverrides.TryGetValue(canonicalName, out var driverId)
            ? driverId
            : string.Empty;
    }

    private static string CanonicalizeDriverName(string value)
    {
        var normalizedName = ToNameCase(value);
        return OfficialResultsDriverReferenceData.DriverAliases.TryGetValue(normalizedName, out var alias)
            ? alias
            : normalizedName;
    }

    private static string ToNameCase(string value)
    {
        return string.Join(
            " ",
            NormalizeText(value)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(part => string.Join(
                    "-",
                    part.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .Select(token => char.ToUpperInvariant(token[0]) + token[1..].ToLowerInvariant()))));

    }

    private static string NormalizeText(string value)
    {
        var withoutTags = HtmlTagPattern.Replace(value, " ");
        return Regex.Replace(WebUtility.HtmlDecode(withoutTags), "\\s+", " ").Trim();
    }
}
