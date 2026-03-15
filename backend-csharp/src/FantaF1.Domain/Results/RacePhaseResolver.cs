using FantaF1.Domain.ReadModels;
using System.Globalization;

namespace FantaF1.Domain.Results;

public sealed class RacePhaseResolver
{
    public string Resolve(WeekendDocument? race, PredictionDocument? results, DateTimeOffset now)
    {
        if (HasOfficialRaceClassification(results))
        {
            return "finished";
        }

        var startTime = GetRaceStartTime(race);
        if (startTime is null)
        {
            return "open";
        }

        return now >= startTime.Value ? "live" : "open";
    }

    private static bool HasOfficialRaceClassification(PredictionDocument? results)
    {
        return !string.IsNullOrWhiteSpace(results?.First)
            && !string.IsNullOrWhiteSpace(results.Second)
            && !string.IsNullOrWhiteSpace(results.Third);
    }

    private static DateTimeOffset? GetRaceStartTime(WeekendDocument? race)
    {
        var startTime = race?.RaceStartTime;
        if (string.IsNullOrWhiteSpace(startTime) && !string.IsNullOrWhiteSpace(race?.EndDate))
        {
            startTime = $"{race.EndDate}T14:00:00Z";
        }

        if (string.IsNullOrWhiteSpace(startTime))
        {
            return null;
        }

        var normalizedTime = startTime.Replace(' ', 'T');
        return DateTimeOffset.TryParse(
            normalizedTime,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsedValue)
            ? parsedValue
            : null;
    }
}
