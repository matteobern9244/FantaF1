using System.Text.RegularExpressions;

namespace FantaF1.Domain.Results;

public sealed class FormulaOneResultsUrlBuilder
{
    private static readonly Regex DetailUrlPattern = new(
        "^https://www\\.formula1\\.com/en/racing/(\\d{4})/([^/?#]+)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1));

    public string Build(string? detailUrl, string? meetingKey)
    {
        var trimmedDetailUrl = (detailUrl ?? string.Empty).TrimEnd('/');
        var trimmedMeetingKey = (meetingKey ?? string.Empty).Trim();
        var match = DetailUrlPattern.Match(trimmedDetailUrl);

        if (!match.Success || string.IsNullOrWhiteSpace(trimmedMeetingKey))
        {
            return string.Empty;
        }

        return $"https://www.formula1.com/en/results/{match.Groups[1].Value}/races/{trimmedMeetingKey}/{match.Groups[2].Value}";
    }
}
