using FantaF1.Domain.ReadModels;
using System.Globalization;

namespace FantaF1.Domain.Results;

public sealed class RaceHighlightsLookupPolicy
{
    private readonly TimeSpan _missingTtl;

    public RaceHighlightsLookupPolicy(TimeSpan? missingTtl = null)
    {
        _missingTtl = missingTtl ?? TimeSpan.FromHours(6);
    }

    public bool ShouldLookup(WeekendDocument race, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(race);

        if (!string.IsNullOrWhiteSpace(race.HighlightsVideoUrl))
        {
            return false;
        }

        var endDateValue = ParseDate(race.EndDate)
            ?? ParseDate(race.StartDate)
            ?? ParseDate(race.RaceStartTime);
        if (endDateValue is null || endDateValue.Value > now)
        {
            return false;
        }

        if (!string.Equals((race.HighlightsLookupStatus ?? string.Empty).Trim(), "missing", StringComparison.Ordinal))
        {
            return true;
        }

        var checkedAtValue = ParseDate(race.HighlightsLookupCheckedAt);
        return checkedAtValue is null || checkedAtValue.Value + _missingTtl <= now;
    }

    public HighlightsLookupDocument BuildLookupResult(
        DateTimeOffset now,
        string? highlightsVideoUrl,
        string? highlightsLookupStatus,
        string? highlightsLookupSource)
    {
        return new HighlightsLookupDocument(
            Normalize(highlightsVideoUrl),
            now.ToString("O"),
            Normalize(highlightsLookupStatus),
            Normalize(highlightsLookupSource));
    }

    private static DateTimeOffset? ParseDate(string? value)
    {
        return DateTimeOffset.TryParse(
            value,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsedValue)
            ? parsedValue
            : null;
    }

    private static string Normalize(string? value)
    {
        return (value ?? string.Empty).Trim();
    }
}
