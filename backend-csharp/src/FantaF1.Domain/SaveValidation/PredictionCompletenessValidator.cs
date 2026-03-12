using FantaF1.Domain.ReadModels;

namespace FantaF1.Domain.SaveValidation;

public sealed class PredictionCompletenessValidator
{
    public bool ValidatePredictions(
        IReadOnlyList<AppDataUserDocument>? users,
        IReadOnlyList<string>? fieldOrder,
        IReadOnlyDictionary<string, WeekendPredictionStateDocument>? weekendStateByMeetingKey,
        string? selectedMeetingKey)
    {
        if (users is null || fieldOrder is null)
        {
            return false;
        }

        var selectedWeekendState = TryResolveSelectedWeekendState(weekendStateByMeetingKey, selectedMeetingKey);
        var predictionUsers = selectedWeekendState is null
            ? users.Select(user => SanitizePrediction(user.Predictions)).ToArray()
            : users.Select(user =>
            {
                selectedWeekendState.UserPredictions!.TryGetValue(user.Name ?? string.Empty, out var prediction);
                return SanitizePrediction(prediction);
            }).ToArray();

        var filledCount = predictionUsers.Sum(prediction =>
            fieldOrder.Count(field => ResolveFieldValue(prediction, field).Trim().Length > 0));

        return filledCount > 0;
    }

    private static WeekendPredictionStateDocument? TryResolveSelectedWeekendState(
        IReadOnlyDictionary<string, WeekendPredictionStateDocument>? weekendStateByMeetingKey,
        string? selectedMeetingKey)
    {
        if (string.IsNullOrWhiteSpace(selectedMeetingKey) || weekendStateByMeetingKey is null)
        {
            return null;
        }

        return weekendStateByMeetingKey.TryGetValue(selectedMeetingKey.Trim(), out var selectedWeekendState)
            ? SanitizeWeekendState(selectedWeekendState)
            : null;
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

    private static string ResolveFieldValue(PredictionDocument? prediction, string field)
    {
        return field switch
        {
            "first" => prediction?.First ?? string.Empty,
            "second" => prediction?.Second ?? string.Empty,
            "third" => prediction?.Third ?? string.Empty,
            "pole" => prediction?.Pole ?? string.Empty,
            _ => string.Empty,
        };
    }
}
