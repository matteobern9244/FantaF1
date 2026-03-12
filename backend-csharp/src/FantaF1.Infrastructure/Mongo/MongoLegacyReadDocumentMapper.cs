using System.Globalization;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoLegacyReadDocumentMapper
{
    public AppDataDocument MapAppData(BsonDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        return new AppDataDocument(
            ReadArray(document, "users", MapUser),
            ReadArray(document, "history", MapHistoryRecord),
            ReadOptionalString(document, "gpName"),
            MapPrediction(ReadDocument(document, "raceResults")),
            ReadOptionalString(document, "selectedMeetingKey"),
            ReadDictionary(document, "weekendStateByMeetingKey", MapWeekendState));
    }

    public DriverDocument MapDriver(BsonDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        return new DriverDocument(
            ReadOptionalString(document, "id") ?? string.Empty,
            ReadOptionalString(document, "name") ?? string.Empty,
            ReadOptionalString(document, "team"),
            ReadOptionalString(document, "color"),
            ReadOptionalString(document, "avatarUrl"),
            ReadOptionalString(document, "teamSlug"));
    }

    public WeekendDocument MapWeekend(BsonDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        return new WeekendDocument(
            ReadOptionalString(document, "meetingKey") ?? string.Empty,
            ReadOptionalString(document, "meetingName"),
            ReadOptionalString(document, "grandPrixTitle"),
            ReadOptionalInt(document, "roundNumber"),
            ReadOptionalString(document, "dateRangeLabel"),
            ReadOptionalString(document, "detailUrl"),
            ReadOptionalString(document, "heroImageUrl"),
            ReadOptionalString(document, "trackOutlineUrl"),
            ReadOptionalBoolean(document, "isSprintWeekend"),
            ReadOptionalString(document, "startDate"),
            ReadOptionalString(document, "endDate"),
            ReadOptionalString(document, "raceStartTime"),
            ReadArray(document, "sessions", MapSession),
            ReadOptionalString(document, "highlightsVideoUrl") ?? string.Empty,
            ReadOptionalString(document, "highlightsLookupCheckedAt") ?? string.Empty,
            ReadOptionalString(document, "highlightsLookupStatus") ?? string.Empty,
            ReadOptionalString(document, "highlightsLookupSource") ?? string.Empty);
    }

    private static AppDataUserDocument MapUser(BsonValue value)
    {
        var document = value as BsonDocument;

        return new AppDataUserDocument(
            ReadOptionalString(document, "name"),
            MapPrediction(ReadDocument(document, "predictions")),
            ReadOptionalDouble(document, "points"));
    }

    private static AppDataHistoryRecordDocument MapHistoryRecord(BsonValue value)
    {
        var document = value as BsonDocument;

        return new AppDataHistoryRecordDocument(
            ReadOptionalString(document, "gpName"),
            ReadOptionalString(document, "meetingKey"),
            ReadOptionalString(document, "date"),
            MapPrediction(ReadDocument(document, "results")),
            ReadDictionary(document, "userPredictions", MapHistoryUserPrediction));
    }

    private static AppDataHistoryUserPredictionDocument MapHistoryUserPrediction(BsonValue value)
    {
        var document = value as BsonDocument;

        return new AppDataHistoryUserPredictionDocument(
            MapPrediction(ReadDocument(document, "prediction")),
            ReadOptionalDouble(document, "pointsEarned"));
    }

    private static WeekendPredictionStateDocument MapWeekendState(BsonValue value)
    {
        var document = value as BsonDocument;

        return new WeekendPredictionStateDocument(
            ReadDictionary(
                document,
                "userPredictions",
                value => MapPrediction(value)
                    ?? throw new InvalidOperationException("Legacy Mongo document mapper returned a null value for a dictionary entry.")),
            MapPrediction(ReadDocument(document, "raceResults")));
    }

    private static WeekendSessionDocument MapSession(BsonValue value)
    {
        var document = value as BsonDocument;

        return new WeekendSessionDocument(
            ReadOptionalString(document, "name"),
            ReadOptionalString(document, "startTime"));
    }

    private static PredictionDocument? MapPrediction(BsonValue? value)
    {
        var document = value as BsonDocument;

        return document is null
            ? null
            : new PredictionDocument(
                ReadOptionalString(document, "first"),
                ReadOptionalString(document, "second"),
                ReadOptionalString(document, "third"),
                ReadOptionalString(document, "pole"));
    }

    private static IReadOnlyList<T> ReadArray<T>(
        BsonDocument? document,
        string fieldName,
        Func<BsonValue, T> mapper)
    {
        if (document is null || !document.TryGetValue(fieldName, out var value) || value is not BsonArray array)
        {
            return [];
        }

        return array.Select(mapper).ToArray();
    }

    private static IReadOnlyDictionary<string, T> ReadDictionary<T>(
        BsonDocument? document,
        string fieldName,
        Func<BsonValue, T> mapper)
    {
        var nestedDocument = ReadDocument(document, fieldName);
        if (nestedDocument is null)
        {
            return new Dictionary<string, T>();
        }

        return nestedDocument.Elements.ToDictionary(
            static element => element.Name,
            element => mapper(element.Value)
                ?? throw new InvalidOperationException("Legacy Mongo document mapper returned a null value for a dictionary entry."),
            StringComparer.Ordinal);
    }

    private static BsonDocument? ReadDocument(BsonDocument? document, string fieldName)
    {
        return document is not null
            && document.TryGetValue(fieldName, out var value)
            && value is BsonDocument nestedDocument
                ? nestedDocument
                : null;
    }

    private static string? ReadOptionalString(BsonDocument? document, string fieldName)
    {
        if (document is null || !document.TryGetValue(fieldName, out var value) || value.IsBsonNull)
        {
            return null;
        }

        return value.IsString ? value.AsString : null;
    }

    private static double? ReadOptionalDouble(BsonDocument? document, string fieldName)
    {
        if (document is null || !document.TryGetValue(fieldName, out var value) || value.IsBsonNull)
        {
            return null;
        }

        if (value.IsDouble)
        {
            return value.AsDouble;
        }

        if (value.IsInt32)
        {
            return value.AsInt32;
        }

        if (value.IsInt64)
        {
            return value.AsInt64;
        }

        return value.IsString
            && double.TryParse(value.AsString, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedValue)
                ? parsedValue
                : null;
    }

    private static int? ReadOptionalInt(BsonDocument? document, string fieldName)
    {
        if (document is null || !document.TryGetValue(fieldName, out var value) || value.IsBsonNull)
        {
            return null;
        }

        if (value.IsInt32)
        {
            return value.AsInt32;
        }

        if (value.IsInt64)
        {
            return (int)value.AsInt64;
        }

        return value.IsString
            && int.TryParse(value.AsString, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedValue)
                ? parsedValue
                : null;
    }

    private static bool ReadOptionalBoolean(BsonDocument? document, string fieldName)
    {
        if (document is null || !document.TryGetValue(fieldName, out var value) || value.IsBsonNull)
        {
            return false;
        }

        if (value.IsBoolean)
        {
            return value.AsBoolean;
        }

        if (value.IsInt32)
        {
            return value.AsInt32 != 0;
        }

        if (value.IsInt64)
        {
            return value.AsInt64 != 0;
        }

        return value.IsString && bool.TryParse(value.AsString, out var parsedValue) && parsedValue;
    }
}
