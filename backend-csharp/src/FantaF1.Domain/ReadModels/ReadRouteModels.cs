namespace FantaF1.Domain.ReadModels;

public sealed record PredictionDocument(
    string? First,
    string? Second,
    string? Third,
    string? Pole);

public sealed record AppDataUserDocument(
    string? Name,
    PredictionDocument? Predictions,
    double? Points);

public sealed record AppDataHistoryUserPredictionDocument(
    PredictionDocument? Prediction,
    double? PointsEarned);

public sealed record AppDataHistoryRecordDocument(
    string? GpName,
    string? MeetingKey,
    string? Date,
    PredictionDocument? Results,
    IReadOnlyDictionary<string, AppDataHistoryUserPredictionDocument>? UserPredictions);

public sealed record WeekendPredictionStateDocument(
    IReadOnlyDictionary<string, PredictionDocument>? UserPredictions,
    PredictionDocument? RaceResults);

public sealed record AppDataDocument(
    IReadOnlyList<AppDataUserDocument>? Users,
    IReadOnlyList<AppDataHistoryRecordDocument>? History,
    string? GpName,
    PredictionDocument? RaceResults,
    string? SelectedMeetingKey,
    IReadOnlyDictionary<string, WeekendPredictionStateDocument>? WeekendStateByMeetingKey);

public sealed record DriverDocument(
    string Id,
    string Name,
    string? Team,
    string? Color,
    string? AvatarUrl,
    string? TeamSlug);

public sealed record WeekendSessionDocument(
    string? Name,
    string? StartTime);

public sealed record WeekendDocument(
    string MeetingKey,
    string? MeetingName,
    string? GrandPrixTitle,
    int? RoundNumber,
    string? DateRangeLabel,
    string? DetailUrl,
    string? HeroImageUrl,
    string? TrackOutlineUrl,
    bool IsSprintWeekend,
    string? StartDate,
    string? EndDate,
    string? RaceStartTime,
    IReadOnlyList<WeekendSessionDocument> Sessions,
    string? HighlightsVideoUrl,
    string? HighlightsLookupCheckedAt,
    string? HighlightsLookupStatus,
    string? HighlightsLookupSource);
