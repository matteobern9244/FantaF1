using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.SaveValidation;
using System.Reflection;

namespace FantaF1.Tests.Unit;

public sealed class SaveValidationTests
{
    [Fact]
    public void Participant_roster_validator_requires_three_unique_trimmed_names()
    {
        var validator = new ParticipantRosterValidator();

        var roster = validator.ResolveParticipantRoster(
        [
            new AppDataUserDocument(" Adriano ", null, 0),
            new AppDataUserDocument("Fabio", null, 0),
            new AppDataUserDocument("Matteo", null, 0),
        ]);
        var invalidRoster = validator.ResolveParticipantRoster(
        [
            new AppDataUserDocument("Adriano", null, 0),
            new AppDataUserDocument("Adriano", null, 0),
            new AppDataUserDocument("Matteo", null, 0),
        ]);

        Assert.Equal(["Adriano", "Fabio", "Matteo"], roster);
        Assert.Null(invalidRoster);
    }

    [Fact]
    public void Participant_roster_validator_rejects_blank_or_missing_names()
    {
        var validator = new ParticipantRosterValidator();

        var rosterWithBlankName = validator.ResolveParticipantRoster(
        [
            new AppDataUserDocument(null, null, 0),
            new AppDataUserDocument(" ", null, 0),
            new AppDataUserDocument("Matteo", null, 0),
        ]);

        Assert.Null(rosterWithBlankName);
    }

    [Fact]
    public void Participant_roster_validator_accepts_the_first_valid_roster_when_no_persisted_roster_exists()
    {
        var validator = new ParticipantRosterValidator();

        var isValid = validator.ValidateParticipants(
        [
            new AppDataUserDocument("Adriano", null, 0),
            new AppDataUserDocument("Fabio", null, 0),
            new AppDataUserDocument("Matteo", null, 0),
        ],
        requiredParticipants: null);

        Assert.True(isValid);
    }

    [Fact]
    public void Participant_roster_validator_returns_false_for_a_null_roster_and_ignores_an_invalid_persisted_roster_shape()
    {
        var validator = new ParticipantRosterValidator();

        Assert.False(validator.ValidateParticipants(null, ["Adriano", "Fabio", "Matteo"]));
        Assert.True(validator.ValidateParticipants(
        [
            new AppDataUserDocument("Adriano", null, 0),
            new AppDataUserDocument("Fabio", null, 0),
            new AppDataUserDocument("Matteo", null, 0),
        ],
        ["Only one"]));
    }

    [Fact]
    public void Prediction_completeness_validator_uses_the_selected_weekend_state_when_available()
    {
        var validator = new PredictionCompletenessValidator();
        var users = new[]
        {
            new AppDataUserDocument("Adriano", new PredictionDocument("", "", "", ""), 0),
            new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
            new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
        };
        var weekendState = new Dictionary<string, WeekendPredictionStateDocument>
        {
            ["race-1"] = new(
                new Dictionary<string, PredictionDocument>
                {
                    ["Adriano"] = new("ver", "", "", ""),
                    ["Fabio"] = new("", "", "", ""),
                    ["Matteo"] = new("", "", "", ""),
                },
                new PredictionDocument("", "", "", "")),
        };

        var result = validator.ValidatePredictions(users, SaveRouteContract.PredictionFieldOrder, weekendState, "race-1");

        Assert.True(result);
    }

    [Fact]
    public void Prediction_completeness_validator_handles_invalid_inputs_and_unknown_fields()
    {
        var validator = new PredictionCompletenessValidator();

        Assert.False(validator.ValidatePredictions(null, SaveRouteContract.PredictionFieldOrder, null, "race-1"));
        Assert.False(validator.ValidatePredictions([], null, null, "race-1"));
        Assert.False(validator.ValidatePredictions(
        [
            new AppDataUserDocument("Adriano", new PredictionDocument("", "", "", ""), 0),
        ],
        ["unexpected"],
        null,
        null));
    }

    [Fact]
    public void Prediction_completeness_validator_private_helpers_cover_trimmed_keys_null_predictions_and_missing_users()
    {
        var validator = new PredictionCompletenessValidator();
        var users = new[]
        {
            new AppDataUserDocument("Adriano", new PredictionDocument("", "", "", ""), 0),
            new AppDataUserDocument(null, new PredictionDocument("", "", "", ""), 0),
        };
        var weekendState = new Dictionary<string, WeekendPredictionStateDocument>
        {
            ["race-1"] = new(
                new Dictionary<string, PredictionDocument>
                {
                    ["Adriano"] = new("ver", null, null, "pole"),
                },
                null),
        };

        var selectedWeekendResult = validator.ValidatePredictions(users, SaveRouteContract.PredictionFieldOrder, weekendState, " race-1 ");
        var missingWeekendResult = validator.ValidatePredictions(users, SaveRouteContract.PredictionFieldOrder, weekendState, "missing");

        var selectedWeekendState = InvokePredictionCompletenessPrivate<WeekendPredictionStateDocument?>(
            "TryResolveSelectedWeekendState",
            weekendState,
            " race-1 ");
        var missingWeekendState = InvokePredictionCompletenessPrivate<WeekendPredictionStateDocument?>(
            "TryResolveSelectedWeekendState",
            weekendState,
            "missing");
        var sanitizedWeekendState = InvokePredictionCompletenessPrivate<WeekendPredictionStateDocument>(
            "SanitizeWeekendState",
            [null]);
        var sanitizedPrediction = InvokePredictionCompletenessPrivate<PredictionDocument>(
            "SanitizePrediction",
            [new PredictionDocument(null, "ham", null, "pole")]);
        var emptyPrediction = InvokePredictionCompletenessPrivate<PredictionDocument>("SanitizePrediction", [null]);
        var firstField = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", new PredictionDocument("ver", null, null, null), "first");
        var firstFieldFromNullPrediction = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", [null, "first"]);
        var secondField = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", new PredictionDocument(null, "ham", null, null), "second");
        var secondFieldFromNullPrediction = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", [null, "second"]);
        var thirdField = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", new PredictionDocument(null, null, "lec", null), "third");
        var thirdFieldFromNullPrediction = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", [null, "third"]);
        var poleField = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", new PredictionDocument(null, null, null, "pole"), "pole");
        var poleFieldFromNullPrediction = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", [null, "pole"]);
        var unknownField = InvokePredictionCompletenessPrivate<string>("ResolveFieldValue", emptyPrediction, "unknown");

        Assert.True(selectedWeekendResult);
        Assert.False(missingWeekendResult);
        Assert.NotNull(selectedWeekendState);
        Assert.Null(missingWeekendState);
        Assert.Empty(sanitizedWeekendState.UserPredictions!);
        Assert.Equal(string.Empty, sanitizedWeekendState.RaceResults!.First);
        Assert.Equal("ver", firstField);
        Assert.Equal(string.Empty, firstFieldFromNullPrediction);
        Assert.Equal("ham", secondField);
        Assert.Equal(string.Empty, secondFieldFromNullPrediction);
        Assert.Equal("lec", thirdField);
        Assert.Equal(string.Empty, thirdFieldFromNullPrediction);
        Assert.Equal("pole", poleField);
        Assert.Equal(string.Empty, poleFieldFromNullPrediction);
        Assert.Equal(string.Empty, unknownField);
    }

    [Fact]
    public void Race_lock_validator_uses_the_race_end_date_when_the_start_time_is_missing()
    {
        var validator = new RaceLockValidator();
        var selectedRace = new WeekendDocument(
            MeetingKey: "race-1",
            MeetingName: "Race 1",
            GrandPrixTitle: "Race 1",
            RoundNumber: 1,
            DateRangeLabel: null,
            DetailUrl: null,
            HeroImageUrl: null,
            TrackOutlineUrl: null,
            IsSprintWeekend: false,
            StartDate: "2026-03-01",
            EndDate: "2026-03-01",
            RaceStartTime: null,
            Sessions: [],
            HighlightsVideoUrl: string.Empty,
            HighlightsLookupCheckedAt: string.Empty,
            HighlightsLookupStatus: string.Empty,
            HighlightsLookupSource: string.Empty);
        var currentData = CreatePayload("ham");
        var newData = CreatePayload("ver");

        var result = validator.IsRaceLocked(
            selectedRace,
            newData,
            currentData,
            new DateTimeOffset(2026, 03, 01, 14, 00, 00, TimeSpan.Zero));

        Assert.True(result);
    }

    [Fact]
    public void Race_lock_validator_returns_false_when_the_race_has_not_started_or_predictions_are_unchanged()
    {
        var validator = new RaceLockValidator();
        var selectedRace = new WeekendDocument(
            "race-1",
            "Race 1",
            "Race 1",
            1,
            null,
            null,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01 14:00:00Z",
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty);
        var currentData = CreatePayload("ver");

        Assert.False(validator.IsRaceLocked(selectedRace, CreatePayload("ver"), currentData, new DateTimeOffset(2026, 03, 01, 13, 59, 00, TimeSpan.Zero)));
        Assert.False(validator.IsRaceLocked(selectedRace, CreatePayload("ver"), currentData, new DateTimeOffset(2026, 03, 01, 14, 00, 00, TimeSpan.Zero)));
        Assert.False(validator.IsRaceLocked(null, CreatePayload("ver"), currentData, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Race_lock_validator_allows_controlled_flows_that_clear_selected_weekend_predictions_after_lock()
    {
        var validator = new RaceLockValidator();
        var selectedRace = CreateWeekend("race-1");
        var currentData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument("ver", "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("lec", "", "", ""), 0),
                new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
            ],
            History: [],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("nor", "ver", "lec", "pia"),
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Adriano"] = new("ver", "", "", ""),
                        ["Fabio"] = new("lec", "", "", ""),
                        ["Matteo"] = new("", "", "", ""),
                    },
                    new PredictionDocument("nor", "ver", "lec", "pia")),
            });
        var clearedPredictions = new PredictionDocument("", "", "", "");
        var newData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", clearedPredictions, 0),
                new AppDataUserDocument("Fabio", clearedPredictions, 0),
                new AppDataUserDocument("Matteo", clearedPredictions, 0),
            ],
            History:
            [
                new AppDataHistoryRecordDocument(
                    "Race 1",
                    "race-1",
                    "01/03/2026",
                    new PredictionDocument("nor", "ver", "lec", "pia"),
                    new Dictionary<string, AppDataHistoryUserPredictionDocument>
                    {
                        ["Adriano"] = new(new PredictionDocument("ver", "", "", ""), 10),
                        ["Fabio"] = new(new PredictionDocument("lec", "", "", ""), 8),
                        ["Matteo"] = new(new PredictionDocument("", "", "", ""), 0),
                    }),
            ],
            GpName: "Race 1",
            RaceResults: clearedPredictions,
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Adriano"] = clearedPredictions,
                        ["Fabio"] = clearedPredictions,
                        ["Matteo"] = clearedPredictions,
                    },
                    clearedPredictions),
            });

        Assert.False(validator.IsRaceLocked(
            selectedRace,
            newData,
            currentData,
            new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));
    }

    [Fact]
    public void Race_lock_validator_uses_the_weekend_state_when_available_and_falls_back_to_the_selected_race_key()
    {
        var validator = new RaceLockValidator();
        var selectedRace = new WeekendDocument(
            "race-1",
            "Race 1",
            "Race 1",
            1,
            null,
            null,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty);
        var currentData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
            ],
            History: [],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("", "", "", ""),
            SelectedMeetingKey: null,
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Adriano"] = new("ham", "", "", ""),
                        ["Fabio"] = new("", "", "", ""),
                        ["Matteo"] = new("", "", "", ""),
                    },
                    new PredictionDocument("", "", "", "")),
            });
        var newData = new AppDataDocument(
            currentData.Users,
            currentData.History,
            currentData.GpName,
            currentData.RaceResults,
            SelectedMeetingKey: null,
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Adriano"] = new("ver", "", "", ""),
                        ["Fabio"] = new("", "", "", ""),
                        ["Matteo"] = new("", "", "", ""),
                    },
                    new PredictionDocument("", "", "", "")),
            });

        Assert.True(validator.IsRaceLocked(selectedRace, newData, currentData, new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));
        Assert.False(validator.IsRaceLocked(
            selectedRace with { RaceStartTime = "not-a-date" },
            newData,
            currentData,
            new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero)));
    }

    [Fact]
    public void Race_lock_validator_private_helpers_cover_selected_meeting_key_and_prediction_extraction_fallbacks()
    {
        var selectedRace = CreateWeekend("race-selected");
        var newData = CreatePayloadForMeeting("race-new", null);
        var currentData = CreatePayloadForMeeting("race-current", null);

        var selectedFromNewData = InvokeRaceLockPrivate<string>("ResolveSelectedMeetingKey", selectedRace, newData, currentData);
        var selectedFromCurrentData = InvokeRaceLockPrivate<string>(
            "ResolveSelectedMeetingKey",
            selectedRace,
            currentData with { SelectedMeetingKey = " " },
            currentData);
        var selectedFromNullNewData = InvokeRaceLockPrivate<string>(
            "ResolveSelectedMeetingKey",
            selectedRace,
            null,
            currentData);
        var selectedFromRace = InvokeRaceLockPrivate<string>(
            "ResolveSelectedMeetingKey",
            selectedRace,
            currentData with { SelectedMeetingKey = " " },
            currentData with { SelectedMeetingKey = " " });
        var selectedFromNullCurrentData = InvokeRaceLockPrivate<string>(
            "ResolveSelectedMeetingKey",
            selectedRace,
            null,
            null);
        var selectedEmpty = InvokeRaceLockPrivate<string>(
            "ResolveSelectedMeetingKey",
            CreateWeekend(null!),
            currentData with { SelectedMeetingKey = " " },
            currentData with { SelectedMeetingKey = " " });

        var extractedFromNullData = InvokeRaceLockPrivate<IReadOnlyList<PredictionDocument>>(
            "ExtractSelectedWeekendPredictions",
            null,
            " ");
        var extractedFromSelectedWeekend = InvokeRaceLockPrivate<IReadOnlyList<PredictionDocument>>(
            "ExtractSelectedWeekendPredictions",
            new AppDataDocument(
                Users:
                [
                    new AppDataUserDocument("Adriano", new PredictionDocument("ham", "", "", ""), 0),
                    new AppDataUserDocument("Fabio", new PredictionDocument(null, null, null, null), 0),
                    new AppDataUserDocument(null, new PredictionDocument("", "", "", ""), 0),
                ],
                History: [],
                GpName: "Race 1",
                RaceResults: new PredictionDocument("", "", "", ""),
                SelectedMeetingKey: "race-1",
                WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
                {
                    ["race-1"] = new(
                        new Dictionary<string, PredictionDocument>
                        {
                            ["Adriano"] = new("ver", null, "", null),
                        },
                        new PredictionDocument("", "", "", "")),
                }),
            "race-1");
        var extractedFromMissingUsers = InvokeRaceLockPrivate<IReadOnlyList<PredictionDocument>>(
            "ExtractSelectedWeekendPredictions",
            new AppDataDocument(
                Users: null,
                History: [],
                GpName: "Race 1",
                RaceResults: new PredictionDocument("", "", "", ""),
                SelectedMeetingKey: "race-1",
                WeekendStateByMeetingKey: null),
            "race-1");

        Assert.Equal("race-new", selectedFromNewData);
        Assert.Equal("race-current", selectedFromCurrentData);
        Assert.Equal("race-current", selectedFromNullNewData);
        Assert.Equal("race-selected", selectedFromRace);
        Assert.Equal("race-selected", selectedFromNullCurrentData);
        Assert.Equal(string.Empty, selectedEmpty);
        Assert.Empty(extractedFromNullData);
        Assert.Equal("ver", extractedFromSelectedWeekend[0].First);
        Assert.Equal(string.Empty, extractedFromSelectedWeekend[0].Second);
        Assert.Equal(string.Empty, extractedFromSelectedWeekend[1].First);
        Assert.Equal(string.Empty, extractedFromSelectedWeekend[2].First);
        Assert.Empty(extractedFromMissingUsers);
    }

    [Fact]
    public void Race_lock_validator_private_helpers_cover_null_sanitization_time_resolution_and_comparer_hashing()
    {
        var sanitizedPredictionFromNull = InvokeRaceLockPrivate<PredictionDocument>("SanitizePrediction", [null]);
        var sanitizedPredictionFromMixedValue = InvokeRaceLockPrivate<PredictionDocument>(
            "SanitizePrediction",
            new PredictionDocument(null, "p2", null, "pole"));
        var sanitizedWeekendState = InvokeRaceLockPrivate<WeekendPredictionStateDocument>("SanitizeWeekendState", [null]);
        var firstNonEmptyMethod = typeof(RaceLockValidator).GetMethod(
            "FirstNonEmpty",
            BindingFlags.NonPublic | BindingFlags.Static)!;
        var firstNonEmpty = (string?)firstNonEmptyMethod.Invoke(null, [new string?[] { "", "  value  ", null }]);
        var noNonEmpty = (string?)firstNonEmptyMethod.Invoke(null, [new string?[] { "", " ", null }]);
        var areAllPredictionsEmptyMethod = typeof(RaceLockValidator).GetMethod(
            "AreAllPredictionsEmpty",
            BindingFlags.NonPublic | BindingFlags.Static)!;

        var tryResolveRaceStartTimeMethod = typeof(RaceLockValidator).GetMethod(
            "TryResolveRaceStartTime",
            BindingFlags.NonPublic | BindingFlags.Static)!;
        object?[] invalidStartTimeArgs = [CreateWeekend("race-1", raceStartTime: null, endDate: " "), null];
        var invalidStartTimeResolved = (bool)tryResolveRaceStartTimeMethod.Invoke(null, invalidStartTimeArgs)!;
        object?[] validStartTimeArgs = [CreateWeekend("race-1", raceStartTime: "2026-03-01 14:00:00Z"), null];
        var validStartTimeResolved = (bool)tryResolveRaceStartTimeMethod.Invoke(null, validStartTimeArgs)!;

        var comparerType = typeof(RaceLockValidator).GetNestedType("SelectedWeekendPredictionComparer", BindingFlags.NonPublic)!;
        var comparer = comparerType.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)!.GetValue(null)!;
        var equalsMethod = comparerType.GetMethod(
            "Equals",
            BindingFlags.Public | BindingFlags.Instance,
            null,
            [typeof(PredictionDocument), typeof(PredictionDocument)],
            null)!;
        var getHashCodeMethod = comparerType.GetMethod(
            "GetHashCode",
            BindingFlags.Public | BindingFlags.Instance,
            null,
            [typeof(PredictionDocument)],
            null)!;

        Assert.True((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("ver", "", "", ""), new PredictionDocument("ver", "", "", "")])!);
        Assert.True((bool)equalsMethod.Invoke(comparer, [null, new PredictionDocument("", "", "", "")])!);
        Assert.True((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("", "", "", ""), null])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("ham", "", "", ""), new PredictionDocument("ver", "", "", "")])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("ver", "ham", "", ""), new PredictionDocument("ver", "lec", "", "")])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("ver", "", "ham", ""), new PredictionDocument("ver", "", "lec", "")])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("ver", "", "", "ham"), new PredictionDocument("ver", "", "", "lec")])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("ver", "", "", ""), null])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("", "ver", "", ""), null])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("", "", "ver", ""), null])!);
        Assert.False((bool)equalsMethod.Invoke(comparer, [new PredictionDocument("", "", "", "ver"), null])!);

        Assert.Equal(string.Empty, sanitizedPredictionFromNull.First);
        Assert.Equal(string.Empty, sanitizedPredictionFromNull.Pole);
        Assert.Equal("p2", sanitizedPredictionFromMixedValue.Second);
        Assert.Equal(string.Empty, sanitizedPredictionFromMixedValue.First);
        Assert.Empty(sanitizedWeekendState.UserPredictions!);
        Assert.Equal(string.Empty, sanitizedWeekendState.RaceResults!.First);
        Assert.Equal("value", firstNonEmpty);
        Assert.Null(noNonEmpty);
        Assert.True((bool)areAllPredictionsEmptyMethod.Invoke(null, [new[]
        {
            new PredictionDocument("", "", "", ""),
            new PredictionDocument(null, null, null, null),
        }])!);
        Assert.False((bool)areAllPredictionsEmptyMethod.Invoke(null, [new[]
        {
            new PredictionDocument("ver", "", "", ""),
        }])!);
        Assert.False(invalidStartTimeResolved);
        Assert.Equal(default, Assert.IsType<DateTimeOffset>(invalidStartTimeArgs[1]!));
        Assert.True(validStartTimeResolved);
        Assert.Equal(new DateTimeOffset(2026, 03, 01, 14, 00, 00, TimeSpan.Zero), Assert.IsType<DateTimeOffset>(validStartTimeArgs[1]!));
        Assert.IsType<int>(getHashCodeMethod.Invoke(comparer, [new PredictionDocument("ver", null, "lec", null)])!);
        Assert.IsType<int>(getHashCodeMethod.Invoke(comparer, [new PredictionDocument(null, "ham", null, "nor")])!);
    }

    [Fact]
    public void App_data_sanitizer_can_prefer_the_payload_selected_weekend_and_reorder_users_to_the_persisted_roster()
    {
        var sanitizer = new AppDataSanitizer();
        var calendar = new[]
        {
            new WeekendDocument(
                MeetingKey: "race-1",
                MeetingName: "Race 1",
                GrandPrixTitle: "Race 1",
                RoundNumber: 1,
                DateRangeLabel: null,
                DetailUrl: null,
                HeroImageUrl: null,
                TrackOutlineUrl: null,
                IsSprintWeekend: false,
                StartDate: "2026-03-01",
                EndDate: "2026-03-01",
                RaceStartTime: null,
                Sessions: [],
                HighlightsVideoUrl: string.Empty,
                HighlightsLookupCheckedAt: string.Empty,
                HighlightsLookupStatus: string.Empty,
                HighlightsLookupSource: string.Empty),
        };
        var payload = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Matteo", new PredictionDocument("ver", "", "", ""), 0),
                new AppDataUserDocument("Adriano", new PredictionDocument("ham", "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("lec", "", "", ""), 0),
            ],
            History: [],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("", "", "", ""),
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Matteo"] = new("old", "", "", ""),
                        ["Adriano"] = new("old", "", "", ""),
                        ["Fabio"] = new("old", "", "", ""),
                    },
                    new PredictionDocument("", "", "", "")),
            });

        var sanitized = sanitizer.Sanitize(
            payload,
            calendar,
            new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero),
            new AppDataSanitizationOptions(
                PreferPayloadSelectedWeekend: true,
                ParticipantRoster: ["Adriano", "Fabio", "Matteo"]));

        Assert.NotNull(sanitized.Users);
        var users = sanitized.Users;
        Assert.Equal(["Adriano", "Fabio", "Matteo"], users.Select(user => user.Name ?? string.Empty).ToArray());
        var firstUserPredictions = users[0].Predictions;
        Assert.NotNull(firstUserPredictions);
        Assert.Equal("ham", firstUserPredictions.First);
        var secondUserPredictions = users[1].Predictions;
        Assert.NotNull(secondUserPredictions);
        Assert.Equal("lec", secondUserPredictions.First);
        var thirdUserPredictions = users[2].Predictions;
        Assert.NotNull(thirdUserPredictions);
        Assert.Equal("ver", thirdUserPredictions.First);
        Assert.NotNull(sanitized.WeekendStateByMeetingKey);
        var racePredictions = sanitized.WeekendStateByMeetingKey["race-1"].UserPredictions;
        Assert.NotNull(racePredictions);
        Assert.Equal("ver", racePredictions["Matteo"].First);
    }

    private static AppDataDocument CreatePayload(string firstPrediction)
    {
        return new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument(firstPrediction, "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
            ],
            History: [],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("", "", "", ""),
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: null);
    }

    private static WeekendDocument CreateWeekend(string meetingKey, string? raceStartTime = "2026-03-01T14:00:00Z", string? endDate = "2026-03-01")
    {
        return new WeekendDocument(
            meetingKey,
            "Race 1",
            "Race 1",
            1,
            null,
            null,
            null,
            null,
            false,
            "2026-03-01",
            endDate,
            raceStartTime,
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty);
    }

    private static AppDataDocument CreatePayloadForMeeting(string? selectedMeetingKey, Dictionary<string, WeekendPredictionStateDocument>? weekendStateByMeetingKey)
    {
        return new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument("ham", "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
            ],
            History: [],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("", "", "", ""),
            SelectedMeetingKey: selectedMeetingKey,
            WeekendStateByMeetingKey: weekendStateByMeetingKey);
    }

    private static T InvokeRaceLockPrivate<T>(string methodName, params object?[] arguments)
    {
        var method = typeof(RaceLockValidator).GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static)!;
        return (T)method.Invoke(null, arguments)!;
    }

    private static T InvokePredictionCompletenessPrivate<T>(string methodName, params object?[] arguments)
    {
        var method = typeof(PredictionCompletenessValidator).GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static)!;
        return (T)method.Invoke(null, arguments)!;
    }
}
