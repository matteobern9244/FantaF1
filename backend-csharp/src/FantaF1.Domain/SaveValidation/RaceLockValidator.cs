using System.Globalization;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Domain.SaveValidation;

public sealed class RaceLockValidator
{
    public bool IsRaceLocked(
        WeekendDocument? selectedRace,
        AppDataDocument? newData,
        AppDataDocument? currentData,
        DateTimeOffset now)
    {
        if (selectedRace is null || !TryResolveRaceStartTime(selectedRace, out var startTime) || now < startTime)
        {
            return false;
        }

        var selectedMeetingKey = ResolveSelectedMeetingKey(selectedRace, newData, currentData);
        var currentPredictions = ExtractSelectedWeekendPredictions(currentData, selectedMeetingKey);
        var newPredictions = ExtractSelectedWeekendPredictions(newData, selectedMeetingKey);

        if (currentPredictions.SequenceEqual(newPredictions, SelectedWeekendPredictionComparer.Instance))
        {
            return false;
        }

        return !AreAllPredictionsEmpty(newPredictions);
    }

    private static string ResolveSelectedMeetingKey(
        WeekendDocument selectedRace,
        AppDataDocument? newData,
        AppDataDocument? currentData)
    {
        return FirstNonEmpty(
                   newData?.SelectedMeetingKey,
                   currentData?.SelectedMeetingKey,
                   selectedRace.MeetingKey)
               ?? string.Empty;
    }

    private static IReadOnlyList<PredictionDocument> ExtractSelectedWeekendPredictions(AppDataDocument? data, string selectedMeetingKey)
    {
        var users = data?.Users ?? [];
        var weekendStateByMeetingKey = data?.WeekendStateByMeetingKey;

        if (string.IsNullOrWhiteSpace(selectedMeetingKey)
            || weekendStateByMeetingKey is null
            || !weekendStateByMeetingKey.ContainsKey(selectedMeetingKey))
        {
            return users.Select(user => SanitizePrediction(user.Predictions)).ToArray();
        }

        var selectedWeekendState = SanitizeWeekendState(weekendStateByMeetingKey[selectedMeetingKey]);

        return users.Select(user =>
        {
            selectedWeekendState.UserPredictions!.TryGetValue(user.Name ?? string.Empty, out var prediction);
            return SanitizePrediction(prediction);
        }).ToArray();
    }

    private static WeekendPredictionStateDocument SanitizeWeekendState(WeekendPredictionStateDocument? value)
    {
        var safeUserPredictions = (value?.UserPredictions ?? new Dictionary<string, PredictionDocument>())
            .ToDictionary(
                static pair => pair.Key,
                pair => SanitizePrediction(pair.Value),
                StringComparer.Ordinal);

        return new WeekendPredictionStateDocument(
            safeUserPredictions,
            SanitizePrediction(value?.RaceResults));
    }

    private static PredictionDocument SanitizePrediction(PredictionDocument? value)
    {
        return new PredictionDocument(
            value?.First ?? string.Empty,
            value?.Second ?? string.Empty,
            value?.Third ?? string.Empty,
            value?.Pole ?? string.Empty);
    }

    private static bool TryResolveRaceStartTime(WeekendDocument selectedRace, out DateTimeOffset startTime)
    {
        var startTimeValue = FirstNonEmpty(
            selectedRace.RaceStartTime,
            string.IsNullOrWhiteSpace(selectedRace.EndDate) ? null : $"{selectedRace.EndDate}T14:00:00Z");

        if (string.IsNullOrWhiteSpace(startTimeValue))
        {
            startTime = default;
            return false;
        }

        var normalizedValue = startTimeValue.Replace(" ", "T", StringComparison.Ordinal);

        return DateTimeOffset.TryParse(
            normalizedValue,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out startTime);
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private static bool AreAllPredictionsEmpty(IReadOnlyList<PredictionDocument> predictions)
    {
        return predictions.All(static prediction =>
            string.IsNullOrWhiteSpace(prediction.First)
            && string.IsNullOrWhiteSpace(prediction.Second)
            && string.IsNullOrWhiteSpace(prediction.Third)
            && string.IsNullOrWhiteSpace(prediction.Pole));
    }

    private sealed class SelectedWeekendPredictionComparer : IEqualityComparer<PredictionDocument>
    {
        public static SelectedWeekendPredictionComparer Instance { get; } = new();

        public bool Equals(PredictionDocument? firstPrediction, PredictionDocument? secondPrediction)
        {
            return string.Equals(firstPrediction?.First ?? string.Empty, secondPrediction?.First ?? string.Empty, StringComparison.Ordinal)
                && string.Equals(firstPrediction?.Second ?? string.Empty, secondPrediction?.Second ?? string.Empty, StringComparison.Ordinal)
                && string.Equals(firstPrediction?.Third ?? string.Empty, secondPrediction?.Third ?? string.Empty, StringComparison.Ordinal)
                && string.Equals(firstPrediction?.Pole ?? string.Empty, secondPrediction?.Pole ?? string.Empty, StringComparison.Ordinal);
        }

        public int GetHashCode(PredictionDocument prediction)
        {
            return HashCode.Combine(
                prediction.First ?? string.Empty,
                prediction.Second ?? string.Empty,
                prediction.Third ?? string.Empty,
                prediction.Pole ?? string.Empty);
        }
    }
}
