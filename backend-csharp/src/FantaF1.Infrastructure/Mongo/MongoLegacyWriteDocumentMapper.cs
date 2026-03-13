using FantaF1.Domain.ReadModels;
using MongoDB.Bson;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoLegacyWriteDocumentMapper
{
    public BsonDocument MapAppData(AppDataDocument document, DateTimeOffset now, BsonDocument? existingDocument = null)
    {
        ArgumentNullException.ThrowIfNull(document);

        var mappedDocument = existingDocument?.DeepClone().AsBsonDocument ?? new BsonDocument();

        mappedDocument["users"] = new BsonArray((document.Users ?? []).Select(MapUser));
        mappedDocument["history"] = new BsonArray((document.History ?? []).Select(MapHistoryRecord));
        mappedDocument["gpName"] = document.GpName ?? string.Empty;
        mappedDocument["raceResults"] = MapPrediction(document.RaceResults);
        mappedDocument["selectedMeetingKey"] = document.SelectedMeetingKey ?? string.Empty;
        mappedDocument["weekendStateByMeetingKey"] = MapWeekendStateByMeetingKey(document.WeekendStateByMeetingKey);
        mappedDocument["lastUpdated"] = new BsonDateTime(now.UtcDateTime);
        mappedDocument["updatedAt"] = new BsonDateTime(now.UtcDateTime);

        if (!mappedDocument.Contains("createdAt"))
        {
            mappedDocument["createdAt"] = new BsonDateTime(now.UtcDateTime);
        }

        return mappedDocument;
    }

    public BsonDocument MapDriver(DriverDocument driver)
    {
        ArgumentNullException.ThrowIfNull(driver);

        return new BsonDocument
        {
            ["id"] = driver.Id ?? string.Empty,
            ["name"] = driver.Name ?? string.Empty,
            ["team"] = driver.Team ?? string.Empty,
            ["color"] = driver.Color ?? string.Empty,
            ["avatarUrl"] = driver.AvatarUrl ?? string.Empty,
            ["teamSlug"] = driver.TeamSlug ?? string.Empty,
        };
    }

    public BsonDocument MapWeekend(WeekendDocument weekend)
    {
        ArgumentNullException.ThrowIfNull(weekend);

        return new BsonDocument
        {
            ["meetingKey"] = weekend.MeetingKey ?? string.Empty,
            ["meetingName"] = weekend.MeetingName ?? string.Empty,
            ["grandPrixTitle"] = weekend.GrandPrixTitle ?? string.Empty,
            ["roundNumber"] = weekend.RoundNumber ?? 0,
            ["dateRangeLabel"] = weekend.DateRangeLabel ?? string.Empty,
            ["detailUrl"] = weekend.DetailUrl ?? string.Empty,
            ["heroImageUrl"] = weekend.HeroImageUrl ?? string.Empty,
            ["trackOutlineUrl"] = weekend.TrackOutlineUrl ?? string.Empty,
            ["isSprintWeekend"] = weekend.IsSprintWeekend,
            ["startDate"] = weekend.StartDate ?? string.Empty,
            ["endDate"] = weekend.EndDate ?? string.Empty,
            ["raceStartTime"] = weekend.RaceStartTime ?? string.Empty,
            ["sessions"] = new BsonArray((weekend.Sessions ?? []).Select(MapWeekendSession)),
            ["highlightsVideoUrl"] = weekend.HighlightsVideoUrl ?? string.Empty,
            ["highlightsLookupCheckedAt"] = weekend.HighlightsLookupCheckedAt ?? string.Empty,
            ["highlightsLookupStatus"] = weekend.HighlightsLookupStatus ?? string.Empty,
            ["highlightsLookupSource"] = weekend.HighlightsLookupSource ?? string.Empty,
        };
    }

    private static BsonDocument MapUser(AppDataUserDocument user)
    {
        return new BsonDocument
        {
            ["name"] = user.Name ?? string.Empty,
            ["predictions"] = MapPrediction(user.Predictions),
            ["points"] = user.Points ?? 0,
        };
    }

    private static BsonDocument MapHistoryRecord(AppDataHistoryRecordDocument record)
    {
        var userPredictions = new BsonDocument();
        foreach (var pair in record.UserPredictions ?? new Dictionary<string, AppDataHistoryUserPredictionDocument>())
        {
            userPredictions[pair.Key] = new BsonDocument
            {
                ["prediction"] = MapPrediction(pair.Value.Prediction),
                ["pointsEarned"] = pair.Value.PointsEarned ?? 0,
            };
        }

        return new BsonDocument
        {
            ["gpName"] = record.GpName ?? string.Empty,
            ["meetingKey"] = record.MeetingKey is null ? BsonNull.Value : record.MeetingKey,
            ["date"] = record.Date ?? string.Empty,
            ["results"] = MapPrediction(record.Results),
            ["userPredictions"] = userPredictions,
        };
    }

    private static BsonDocument MapPrediction(PredictionDocument? prediction)
    {
        return new BsonDocument
        {
            ["first"] = prediction?.First ?? string.Empty,
            ["second"] = prediction?.Second ?? string.Empty,
            ["third"] = prediction?.Third ?? string.Empty,
            ["pole"] = prediction?.Pole ?? string.Empty,
        };
    }

    private static BsonDocument MapWeekendSession(WeekendSessionDocument session)
    {
        return new BsonDocument
        {
            ["name"] = session.Name ?? string.Empty,
            ["startTime"] = session.StartTime ?? string.Empty,
        };
    }

    private static BsonDocument MapWeekendStateByMeetingKey(
        IReadOnlyDictionary<string, WeekendPredictionStateDocument>? weekendStateByMeetingKey)
    {
        var mappedWeekendStates = new BsonDocument();

        foreach (var pair in weekendStateByMeetingKey ?? new Dictionary<string, WeekendPredictionStateDocument>())
        {
            var userPredictions = new BsonDocument();
            foreach (var userPredictionPair in pair.Value.UserPredictions ?? new Dictionary<string, PredictionDocument>())
            {
                userPredictions[userPredictionPair.Key] = MapPrediction(userPredictionPair.Value);
            }

            mappedWeekendStates[pair.Key] = new BsonDocument
            {
                ["userPredictions"] = userPredictions,
                ["raceResults"] = MapPrediction(pair.Value.RaceResults),
            };
        }

        return mappedWeekendStates;
    }
}
