using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace FantaF1.Domain.ReadModels;

public sealed class AppDataSanitizer
{
    private const int ParticipantSlots = 3;
    private const string UnknownUserName = "Unknown";

    public AppDataDocument CreateDefaultAppData(IReadOnlyList<WeekendDocument> calendar, DateTimeOffset now)
    {
        var selectedMeeting = ResolveSelectedMeeting(calendar, selectedMeetingKey: null, gpName: null, now);

        return new AppDataDocument(
            CreateInitialUsers(),
            [],
            selectedMeeting?.GrandPrixTitle ?? selectedMeeting?.MeetingName ?? string.Empty,
            CreateEmptyPrediction(),
            selectedMeeting?.MeetingKey ?? string.Empty,
            new Dictionary<string, WeekendPredictionStateDocument>());
    }

    public AppDataDocument Sanitize(AppDataDocument? value, IReadOnlyList<WeekendDocument> calendar, DateTimeOffset now)
    {
        return Sanitize(value, calendar, now, AppDataSanitizationOptions.Default);
    }

    public AppDataDocument Sanitize(
        AppDataDocument? value,
        IReadOnlyList<WeekendDocument> calendar,
        DateTimeOffset now,
        AppDataSanitizationOptions? options)
    {
        var sanitizationOptions = options ?? AppDataSanitizationOptions.Default;
        var defaultData = CreateDefaultAppData(calendar, now);
        var incomingUsers = value?.Users ?? [];
        var normalizedUsers = SanitizeUsers(incomingUsers, defaultData.Users!, sanitizationOptions.ParticipantRoster);
        var history = (value?.History ?? [])
            .Select(SanitizeRaceRecord)
            .ToArray();
        var selectedMeeting = ResolveSelectedMeeting(calendar, value?.SelectedMeetingKey, value?.GpName, now);
        var fallbackGpName = value?.GpName ?? defaultData.GpName!;
        var fallbackMeetingKey = value?.SelectedMeetingKey ?? defaultData.SelectedMeetingKey!;
        var resolvedMeetingKey = selectedMeeting?.MeetingKey ?? fallbackMeetingKey;
        var incomingWeekendStateByMeetingKey = SanitizeWeekendStateByMeetingKey(value?.WeekendStateByMeetingKey);
        var fallbackSelectedWeekendState = BuildWeekendStateFromUsers(
            normalizedUsers,
            SanitizePrediction(value?.RaceResults));
        var hasPersistedSelectedWeekendState =
            !string.IsNullOrWhiteSpace(resolvedMeetingKey)
            && incomingWeekendStateByMeetingKey.ContainsKey(resolvedMeetingKey);
        var selectedWeekendState = SanitizeWeekendState(
            sanitizationOptions.PreferPayloadSelectedWeekend || !hasPersistedSelectedWeekendState
                ? fallbackSelectedWeekendState
                : GetSelectedWeekendState(incomingWeekendStateByMeetingKey, resolvedMeetingKey));
        var weekendStateByMeetingKey = UpsertSelectedWeekendState(
            incomingWeekendStateByMeetingKey,
            resolvedMeetingKey,
            HydrateUsersForSelectedWeekend(normalizedUsers, selectedWeekendState),
            selectedWeekendState.RaceResults!);
        var hydratedUsers = HydrateUsersForSelectedWeekend(normalizedUsers, selectedWeekendState);

        return new AppDataDocument(
            hydratedUsers,
            history,
            selectedMeeting?.GrandPrixTitle ?? selectedMeeting?.MeetingName ?? fallbackGpName,
            selectedWeekendState.RaceResults!,
            resolvedMeetingKey,
            weekendStateByMeetingKey);
    }

    public PredictionDocument CreateEmptyPrediction()
    {
        return new PredictionDocument(string.Empty, string.Empty, string.Empty, string.Empty);
    }

    private AppDataHistoryRecordDocument SanitizeRaceRecord(AppDataHistoryRecordDocument? record)
    {
        var safeUserPredictions = (record?.UserPredictions ?? new Dictionary<string, AppDataHistoryUserPredictionDocument>())
            .ToDictionary(
                static pair => pair.Key,
                pair => new AppDataHistoryUserPredictionDocument(
                    SanitizePrediction(pair.Value?.Prediction),
                    SanitizeNumericValue(pair.Value?.PointsEarned)));

        return new AppDataHistoryRecordDocument(
            record?.GpName ?? string.Empty,
            string.IsNullOrWhiteSpace(record?.MeetingKey) ? null : record!.MeetingKey!.Trim(),
            record?.Date ?? string.Empty,
            SanitizePrediction(record?.Results),
            safeUserPredictions);
    }

    private IReadOnlyList<AppDataUserDocument> CreateInitialUsers()
    {
        return Enumerable.Range(1, ParticipantSlots)
            .Select(index => new AppDataUserDocument(
                $"Player {index}",
                CreateEmptyPrediction(),
                0))
            .ToArray();
    }

    private IReadOnlyList<AppDataUserDocument> SanitizeUsers(
        IReadOnlyList<AppDataUserDocument> incomingUsers,
        IReadOnlyList<AppDataUserDocument> defaultUsers,
        IReadOnlyList<string>? participantRoster)
    {
        var resolvedIncomingRoster = ResolveIncomingRoster(incomingUsers, participantRoster);

        if (incomingUsers.Count >= ParticipantSlots)
        {
            return NormalizeUsersToRoster(
                incomingUsers.Take(ParticipantSlots)
                    .Select(user => SanitizeUser(
                        user,
                        string.IsNullOrWhiteSpace(user.Name) ? UnknownUserName : user.Name!))
                    .ToArray(),
                resolvedIncomingRoster);
        }

        if (incomingUsers.Count > 0)
        {
            return NormalizeUsersToRoster(
                incomingUsers
                    .Select(user => SanitizeUser(
                        user,
                        string.IsNullOrWhiteSpace(user.Name) ? UnknownUserName : user.Name!))
                    .Concat(CreateInitialUsers().Skip(incomingUsers.Count))
                    .ToArray(),
                resolvedIncomingRoster);
        }

        return defaultUsers;
    }

    private AppDataUserDocument SanitizeUser(AppDataUserDocument? user, string fallbackName)
    {
        var name = string.IsNullOrWhiteSpace(user?.Name) ? fallbackName : user!.Name!.Trim();

        return new AppDataUserDocument(
            name,
            SanitizePrediction(user?.Predictions),
            SanitizeNumericValue(user?.Points));
    }

    private IReadOnlyList<AppDataUserDocument> NormalizeUsersToRoster(
        IReadOnlyList<AppDataUserDocument> users,
        IReadOnlyList<string>? roster)
    {
        if (roster is null || roster.Count != ParticipantSlots)
        {
            return users;
        }

        var usersByName = users.ToDictionary(
            user => user.Name?.Trim() ?? string.Empty,
            user => user,
            StringComparer.Ordinal);

        return users.Count == ParticipantSlots && roster.All(usersByName.ContainsKey)
            ? roster.Select(name => usersByName[name]).ToArray()
            : users;
    }

    private static IReadOnlyList<string>? ResolveParticipantRoster(IReadOnlyList<AppDataUserDocument> incomingUsers)
    {
        if (incomingUsers.Count != ParticipantSlots)
        {
            return null;
        }

        var normalizedNames = incomingUsers
            .Select(user => user.Name?.Trim() ?? string.Empty)
            .ToArray();

        if (normalizedNames.Any(string.IsNullOrEmpty))
        {
            return null;
        }

        return normalizedNames.Distinct(StringComparer.Ordinal).Count() == ParticipantSlots
            ? normalizedNames
            : null;
    }

    private static IReadOnlyList<string>? ResolveIncomingRoster(
        IReadOnlyList<AppDataUserDocument> incomingUsers,
        IReadOnlyList<string>? participantRoster)
    {
        return participantRoster is { Count: ParticipantSlots }
            ? participantRoster
            : ResolveParticipantRoster(incomingUsers);
    }

    private PredictionDocument SanitizePrediction(PredictionDocument? value)
    {
        return new PredictionDocument(
            value?.First ?? string.Empty,
            value?.Second ?? string.Empty,
            value?.Third ?? string.Empty,
            value?.Pole ?? string.Empty);
    }

    private WeekendPredictionStateDocument SanitizeWeekendState(WeekendPredictionStateDocument? value)
    {
        var safeUserPredictions = (value?.UserPredictions ?? new Dictionary<string, PredictionDocument>())
            .ToDictionary(
                static pair => pair.Key,
                pair => SanitizePrediction(pair.Value));

        return new WeekendPredictionStateDocument(
            safeUserPredictions,
            SanitizePrediction(value?.RaceResults));
    }

    private IReadOnlyDictionary<string, WeekendPredictionStateDocument> SanitizeWeekendStateByMeetingKey(
        IReadOnlyDictionary<string, WeekendPredictionStateDocument>? value)
    {
        if (value is null)
        {
            return new Dictionary<string, WeekendPredictionStateDocument>();
        }

        return value
            .Where(pair => !string.IsNullOrWhiteSpace(pair.Key))
            .ToDictionary(
                pair => pair.Key.Trim(),
                pair => SanitizeWeekendState(pair.Value),
                StringComparer.Ordinal);
    }

    private WeekendPredictionStateDocument BuildWeekendStateFromUsers(
        IReadOnlyList<AppDataUserDocument> users,
        PredictionDocument raceResults)
    {
        var userPredictions = new Dictionary<string, PredictionDocument>(StringComparer.Ordinal);

        foreach (var user in users)
        {
            userPredictions[user.Name ?? string.Empty] = SanitizePrediction(user.Predictions);
        }

        return new WeekendPredictionStateDocument(
            userPredictions,
            SanitizePrediction(raceResults));
    }

    private IReadOnlyDictionary<string, WeekendPredictionStateDocument> UpsertSelectedWeekendState(
        IReadOnlyDictionary<string, WeekendPredictionStateDocument> weekendStateByMeetingKey,
        string? selectedMeetingKey,
        IReadOnlyList<AppDataUserDocument> users,
        PredictionDocument raceResults)
    {
        var safeWeekendStateByMeetingKey = SanitizeWeekendStateByMeetingKey(weekendStateByMeetingKey);

        if (string.IsNullOrWhiteSpace(selectedMeetingKey))
        {
            return safeWeekendStateByMeetingKey;
        }

        var nextState = new Dictionary<string, WeekendPredictionStateDocument>(safeWeekendStateByMeetingKey, StringComparer.Ordinal)
        {
            [selectedMeetingKey.Trim()] = BuildWeekendStateFromUsers(users, raceResults),
        };

        return nextState;
    }

    private WeekendPredictionStateDocument GetSelectedWeekendState(
        IReadOnlyDictionary<string, WeekendPredictionStateDocument> weekendStateByMeetingKey,
        string? selectedMeetingKey)
    {
        return weekendStateByMeetingKey.TryGetValue(selectedMeetingKey!.Trim(), out var weekendState)
            ? SanitizeWeekendState(weekendState)
            : new WeekendPredictionStateDocument(new Dictionary<string, PredictionDocument>(), CreateEmptyPrediction());
    }

    private IReadOnlyList<AppDataUserDocument> HydrateUsersForSelectedWeekend(
        IReadOnlyList<AppDataUserDocument> users,
        WeekendPredictionStateDocument weekendState)
    {
        var safeWeekendState = SanitizeWeekendState(weekendState);

        return users.Select(user => user with
        {
            Predictions = safeWeekendState.UserPredictions!.TryGetValue(user.Name ?? string.Empty, out var prediction)
                ? SanitizePrediction(prediction)
                : CreateEmptyPrediction(),
        }).ToArray();
    }

    private WeekendDocument? ResolveSelectedMeeting(
        IReadOnlyList<WeekendDocument> calendar,
        string? selectedMeetingKey,
        string? gpName,
        DateTimeOffset now)
    {
        if (calendar.Count == 0)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(selectedMeetingKey))
        {
            var directMatch = calendar.FirstOrDefault(weekend =>
                string.Equals(weekend.MeetingKey, selectedMeetingKey.Trim(), StringComparison.Ordinal));
            if (directMatch is not null)
            {
                return directMatch;
            }
        }

        var normalizedGpName = NormalizeMeetingName(gpName);
        if (!string.IsNullOrWhiteSpace(normalizedGpName))
        {
            var gpMatch = calendar.FirstOrDefault(weekend =>
                string.Equals(NormalizeMeetingName(weekend.MeetingName), normalizedGpName, StringComparison.Ordinal)
                || string.Equals(NormalizeMeetingName(weekend.GrandPrixTitle), normalizedGpName, StringComparison.Ordinal));
            if (gpMatch is not null)
            {
                return gpMatch;
            }
        }

        return GetNextUpcomingMeeting(calendar, now);
    }

    private WeekendDocument GetNextUpcomingMeeting(IReadOnlyList<WeekendDocument> calendar, DateTimeOffset now)
    {
        var sortedCalendar = SortCalendarByDate(calendar);

        return sortedCalendar.FirstOrDefault(weekend =>
        {
            var rawValue = weekend.EndDate ?? weekend.StartDate;
            return TryParseDateValue(rawValue, out var endDateValue) && endDateValue >= now;
        }) ?? sortedCalendar[0];
    }

    private IReadOnlyList<WeekendDocument> SortCalendarByDate(IReadOnlyList<WeekendDocument> calendar)
    {
        return calendar
            .OrderBy(weekend => weekend, WeekendDateComparer.Instance)
            .ToArray();
    }

    private static double SanitizeNumericValue(double? value)
    {
        return value is double numericValue && double.IsFinite(numericValue)
            ? numericValue
            : 0;
    }

    private static string NormalizeMeetingName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return Regex.Replace(builder.ToString().ToLowerInvariant(), "[^a-z0-9]+", " ").Trim();
    }

    private static bool TryParseDateValue(string? rawValue, out DateTimeOffset parsedValue)
    {
        return DateTimeOffset.TryParse(
            rawValue,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out parsedValue);
    }

    private sealed class WeekendDateComparer : IComparer<WeekendDocument>
    {
        public static WeekendDateComparer Instance { get; } = new();

        public int Compare(WeekendDocument? firstWeekend, WeekendDocument? secondWeekend)
        {
            if (ReferenceEquals(firstWeekend, secondWeekend))
            {
                return 0;
            }

            if (firstWeekend is null)
            {
                return -1;
            }

            if (secondWeekend is null)
            {
                return 1;
            }

            var firstRound = firstWeekend.RoundNumber;
            var secondRound = secondWeekend.RoundNumber;
            if (firstRound.HasValue && secondRound.HasValue && firstRound.Value != secondRound.Value)
            {
                return firstRound.Value - secondRound.Value;
            }

            var firstDate = TryParseDateValue(firstWeekend.StartDate ?? firstWeekend.EndDate, out var parsedFirstDate)
                ? parsedFirstDate
                : DateTimeOffset.MaxValue;
            var secondDate = TryParseDateValue(secondWeekend.StartDate ?? secondWeekend.EndDate, out var parsedSecondDate)
                ? parsedSecondDate
                : DateTimeOffset.MaxValue;

            return firstDate.CompareTo(secondDate);
        }
    }
}
