using System.Reflection;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Tests.Unit;

public sealed class AppDataSanitizerTests
{
    [Fact]
    public void Create_default_app_data_returns_empty_values_when_calendar_is_empty()
    {
        var sanitizer = new AppDataSanitizer();

        var result = sanitizer.CreateDefaultAppData([], new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal(string.Empty, result.GpName);
        Assert.Equal(string.Empty, result.SelectedMeetingKey);
        Assert.Equal(3, result.Users!.Count);
        Assert.All(result.Users, user =>
        {
            Assert.NotNull(user.Predictions);
            Assert.Equal(string.Empty, user.Predictions!.First);
            Assert.Equal(0, user.Points);
        });
        Assert.Empty(result.History!);
        Assert.Empty(result.WeekendStateByMeetingKey!);
    }

    [Fact]
    public void Create_default_app_data_uses_the_first_calendar_entry_when_all_dates_are_invalid()
    {
        var sanitizer = new AppDataSanitizer();
        var calendar = new[]
        {
            CreateWeekendDocument("race-2", "Race 2", "Grand Prix 2", 2, "not-a-date", "not-a-date"),
            CreateWeekendDocument("race-1", "Race 1", "Grand Prix 1", 1, "still-not-a-date", "still-not-a-date"),
        };

        var result = sanitizer.CreateDefaultAppData(calendar, new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal("race-1", result.SelectedMeetingKey);
        Assert.Equal("Grand Prix 1", result.GpName);
    }

    [Fact]
    public void Sanitize_truncates_to_three_slots_when_the_incoming_roster_is_valid()
    {
        var sanitizer = new AppDataSanitizer();
        var appData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument(" Anna ", new PredictionDocument(null, "ham", null, null), double.PositiveInfinity),
                new AppDataUserDocument("Bruno", null, 10),
                new AppDataUserDocument("Carlo", new PredictionDocument("ver", "lec", "rus", "pia"), 20),
                new AppDataUserDocument("Discarded", new PredictionDocument("nor", "ham", "lec", "ver"), 30),
            ],
            History: [],
            GpName: null,
            RaceResults: null,
            SelectedMeetingKey: "monaco",
            WeekendStateByMeetingKey: null);
        var calendar = new[]
        {
            CreateWeekendDocument("monaco", "Monaco", "Monaco Grand Prix", 8, "2026-05-24", "2026-05-24"),
        };

        var result = sanitizer.Sanitize(appData, calendar, new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.NotNull(result.Users);
        var users = result.Users;

        Assert.Equal(["Anna", "Bruno", "Carlo"], users.Select(user => user.Name ?? string.Empty).ToArray());
        Assert.Equal(0, users[0].Points);
        var firstUserPredictions = users[0].Predictions;
        Assert.NotNull(firstUserPredictions);
        Assert.Equal("ham", firstUserPredictions.Second);
        Assert.Equal("monaco", result.SelectedMeetingKey);
        Assert.NotNull(result.WeekendStateByMeetingKey);
        Assert.True(result.WeekendStateByMeetingKey.ContainsKey("monaco"));
    }

    [Fact]
    public void Sanitize_keeps_the_incoming_order_when_the_roster_cannot_be_resolved_from_duplicate_names()
    {
        var sanitizer = new AppDataSanitizer();
        var weekendStateByMeetingKey = new Dictionary<string, WeekendPredictionStateDocument>
        {
            ["monza"] = new(
                new Dictionary<string, PredictionDocument>
                {
                    ["Mario"] = new("ver", string.Empty, string.Empty, string.Empty),
                    ["Luigi"] = new("lec", string.Empty, string.Empty, string.Empty),
                },
                new PredictionDocument("ver", "lec", "rus", "pia")),
        };
        var appData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Mario", null, 1),
                new AppDataUserDocument("Mario", null, 2),
                new AppDataUserDocument("Luigi", null, 3),
            ],
            History: [],
            GpName: null,
            RaceResults: new PredictionDocument("legacy", null, null, null),
            SelectedMeetingKey: "monza",
            WeekendStateByMeetingKey: weekendStateByMeetingKey);

        var result = sanitizer.Sanitize(
            appData,
            [CreateWeekendDocument("monza", "Monza", "Italian Grand Prix", 16, "2026-09-06", "2026-09-06")],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.NotNull(result.Users);
        var users = result.Users;

        Assert.Equal(["Mario", "Mario", "Luigi"], users.Select(user => user.Name ?? string.Empty).ToArray());
        var firstUserPredictions = users[0].Predictions;
        Assert.NotNull(firstUserPredictions);
        Assert.Equal("ver", firstUserPredictions.First);
        var secondUserPredictions = users[1].Predictions;
        Assert.NotNull(secondUserPredictions);
        Assert.Equal("ver", secondUserPredictions.First);
        Assert.NotNull(result.RaceResults);
        Assert.Equal("pia", result.RaceResults.Pole);
    }

    [Fact]
    public void Sanitize_keeps_the_incoming_order_when_the_roster_cannot_be_resolved_from_blank_names()
    {
        var sanitizer = new AppDataSanitizer();
        var appData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Mario", null, 1),
                new AppDataUserDocument(" ", new PredictionDocument(null, "ham", null, null), 2),
                new AppDataUserDocument("Luigi", null, 3),
            ],
            History: [],
            GpName: null,
            RaceResults: null,
            SelectedMeetingKey: "imola",
            WeekendStateByMeetingKey: null);

        var result = sanitizer.Sanitize(
            appData,
            [CreateWeekendDocument("imola", "Imola", "Emilia Romagna Grand Prix", 7, "2026-05-18", "2026-05-18")],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.NotNull(result.Users);
        var users = result.Users;

        Assert.Equal(["Mario", "Unknown", "Luigi"], users.Select(user => user.Name ?? string.Empty).ToArray());
        var secondUserPredictions = users[1].Predictions;
        Assert.NotNull(secondUserPredictions);
        Assert.Equal("ham", secondUserPredictions.Second);
    }

    [Fact]
    public void Sanitize_filters_blank_weekend_keys_and_uses_the_existing_dictionary_when_the_selected_meeting_key_is_blank()
    {
        var sanitizer = new AppDataSanitizer();
        var appData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Player 1", null, 1),
                new AppDataUserDocument("Player 2", null, 2),
                new AppDataUserDocument("Player 3", null, 3),
            ],
            History: [],
            GpName: null,
            RaceResults: null,
            SelectedMeetingKey: "  ",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["  "] = new(new Dictionary<string, PredictionDocument>(), new PredictionDocument("ver", null, null, null)),
                [" imola "] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Player 1"] = new("lec", null, null, null),
                    },
                    new PredictionDocument("ver", "lec", "rus", "pia")),
            });

        var result = sanitizer.Sanitize(appData, [], new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal("  ", result.SelectedMeetingKey);
        Assert.NotNull(result.WeekendStateByMeetingKey);
        var weekendStateByMeetingKey = result.WeekendStateByMeetingKey;
        Assert.Equal(["imola"], weekendStateByMeetingKey.Keys.ToArray());
        var imolaPredictions = weekendStateByMeetingKey["imola"].UserPredictions;
        Assert.NotNull(imolaPredictions);
        Assert.Equal("lec", imolaPredictions["Player 1"].First);
    }

    [Fact]
    public void Sanitize_collapses_duplicate_weekend_keys_after_trimming_instead_of_throwing()
    {
        var sanitizer = new AppDataSanitizer();
        var appData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Player 1", new PredictionDocument("ver", null, null, null), 1),
                new AppDataUserDocument("Player 2", null, 2),
                new AppDataUserDocument("Player 3", null, 3),
            ],
            History: [],
            GpName: "Imola",
            RaceResults: new PredictionDocument(null, null, null, "pia"),
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                [" race-1 "] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Player 1"] = new("ver", null, null, null),
                    },
                    new PredictionDocument(null, null, null, "nor")),
                ["race-1"] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Player 1"] = new("ham", null, null, null),
                    },
                    new PredictionDocument(null, null, null, "pia")),
            });

        var result = sanitizer.Sanitize(
            appData,
            [CreateWeekendDocument("race-1", "Imola", "Imola Grand Prix", 7, "2026-05-18", "2026-05-18")],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero),
            new AppDataSanitizationOptions(
                PreferPayloadSelectedWeekend: false,
                ParticipantRoster: ["Player 1", "Player 2", "Player 3"]));

        Assert.Equal("race-1", result.SelectedMeetingKey);
        Assert.NotNull(result.WeekendStateByMeetingKey);
        Assert.Equal(["race-1"], result.WeekendStateByMeetingKey.Keys.ToArray());
        Assert.Equal("ham", result.WeekendStateByMeetingKey["race-1"].UserPredictions!["Player 1"].First);
        Assert.Equal("pia", result.WeekendStateByMeetingKey["race-1"].RaceResults!.Pole);
    }

    [Fact]
    public void Sanitize_null_payload_uses_default_meeting_name_when_the_calendar_entry_has_no_grand_prix_title()
    {
        var sanitizer = new AppDataSanitizer();

        var result = sanitizer.Sanitize(
            null,
            [CreateWeekendDocument("imola", "Imola", null!, 7, "2026-05-18", "2026-05-18")],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal("imola", result.SelectedMeetingKey);
        Assert.Equal("Imola", result.GpName);
        Assert.NotNull(result.Users);
        Assert.Equal(["Player 1", "Player 2", "Player 3"], result.Users.Select(user => user.Name ?? string.Empty).ToArray());
    }

    [Fact]
    public void Sanitize_four_argument_overload_uses_default_options_when_none_are_provided()
    {
        var sanitizer = new AppDataSanitizer();

        var result = sanitizer.Sanitize(
            new AppDataDocument(null, null, null, null, null, null),
            [],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero),
            options: null);

        Assert.Equal(string.Empty, result.SelectedMeetingKey);
        Assert.NotNull(result.Users);
        Assert.Equal(["Player 1", "Player 2", "Player 3"], result.Users.Select(user => user.Name ?? string.Empty).ToArray());
    }

    [Fact]
    public void Sanitize_handles_a_payload_with_all_null_properties()
    {
        var sanitizer = new AppDataSanitizer();

        var result = sanitizer.Sanitize(
            new AppDataDocument(null, null, null, null, null, null),
            [],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal(string.Empty, result.SelectedMeetingKey);
        Assert.Equal(string.Empty, result.GpName);
        Assert.NotNull(result.Users);
        Assert.Equal(["Player 1", "Player 2", "Player 3"], result.Users.Select(user => user.Name ?? string.Empty).ToArray());
        Assert.NotNull(result.RaceResults);
        Assert.Equal(string.Empty, result.RaceResults.First);
        Assert.NotNull(result.History);
        Assert.Empty(result.History);
        Assert.NotNull(result.WeekendStateByMeetingKey);
        Assert.Empty(result.WeekendStateByMeetingKey);
    }

    [Fact]
    public void Sanitize_defaults_history_and_race_results_when_nested_values_are_missing()
    {
        var sanitizer = new AppDataSanitizer();
        var appData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Player 1", null, 1),
                new AppDataUserDocument("Player 2", null, 2),
                new AppDataUserDocument("Player 3", null, 3),
            ],
            History:
            [
                new AppDataHistoryRecordDocument("Historic GP", " ", "01/01/2026", null, null),
            ],
            GpName: null,
            RaceResults: null,
            SelectedMeetingKey: "imola",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["imola"] = new(new Dictionary<string, PredictionDocument>(), null),
            });

        var result = sanitizer.Sanitize(
            appData,
            [CreateWeekendDocument("imola", "Imola", "Emilia Romagna Grand Prix", 7, "2026-05-18", "2026-05-18")],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.NotNull(result.History);
        var historyRecord = result.History.Single();
        Assert.Null(historyRecord.MeetingKey);
        Assert.NotNull(historyRecord.UserPredictions);
        Assert.Empty(historyRecord.UserPredictions);
        Assert.NotNull(result.RaceResults);
        Assert.Equal(string.Empty, result.RaceResults.First);
        Assert.Equal(string.Empty, result.RaceResults.Pole);
    }

    [Fact]
    public void Sanitize_tolerates_null_history_user_prediction_entries()
    {
        var sanitizer = new AppDataSanitizer();
        var result = sanitizer.Sanitize(
            new AppDataDocument(
                Users:
                [
                    new AppDataUserDocument("Player 1", null, 1),
                    new AppDataUserDocument("Player 2", null, 2),
                    new AppDataUserDocument("Player 3", null, 3),
                ],
                History:
                [
                    new AppDataHistoryRecordDocument(
                        "Historic GP",
                        "historic",
                        "01/01/2026",
                        null,
                        new Dictionary<string, AppDataHistoryUserPredictionDocument>
                        {
                            ["Player 1"] = null!,
                        }),
                ],
                GpName: null,
                RaceResults: null,
                SelectedMeetingKey: "imola",
                WeekendStateByMeetingKey: null),
            [CreateWeekendDocument("imola", "Imola", "Emilia Romagna Grand Prix", 7, "2026-05-18", "2026-05-18")],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.NotNull(result.History);
        var historyRecord = result.History.Single();
        Assert.NotNull(historyRecord.UserPredictions);
        var playerPrediction = historyRecord.UserPredictions["Player 1"];
        Assert.NotNull(playerPrediction.Prediction);
        Assert.Equal(string.Empty, playerPrediction.Prediction.First);
        Assert.Equal(0, playerPrediction.PointsEarned);
    }

    [Fact]
    public void Sanitize_uses_payload_gp_name_and_selected_meeting_key_when_the_calendar_is_empty()
    {
        var sanitizer = new AppDataSanitizer();
        var result = sanitizer.Sanitize(
            new AppDataDocument(
                Users: null,
                History: null,
                GpName: "Payload Grand Prix",
                RaceResults: null,
                SelectedMeetingKey: "payload-meeting",
                WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
                {
                    ["payload-meeting"] = new(
                        new Dictionary<string, PredictionDocument>
                        {
                            ["Player 1"] = new("ver", null, null, null),
                        },
                        new PredictionDocument("lec", null, null, null)),
                }),
            [],
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal("Payload Grand Prix", result.GpName);
        Assert.Equal("payload-meeting", result.SelectedMeetingKey);
        Assert.Equal("lec", result.RaceResults!.First);
        Assert.Equal("ver", result.Users![0].Predictions!.First);
    }

    [Fact]
    public void Sanitize_resolves_the_selected_meeting_from_the_normalized_gp_name()
    {
        var sanitizer = new AppDataSanitizer();
        var appData = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Player 1", new PredictionDocument("ver", null, null, null), 1),
                new AppDataUserDocument("Player 2", null, 2),
                new AppDataUserDocument("Player 3", null, 3),
            ],
            History:
            [
                new AppDataHistoryRecordDocument(
                    "Historic GP",
                    "historic",
                    "01/01/2026",
                    null,
                    new Dictionary<string, AppDataHistoryUserPredictionDocument>
                    {
                        ["Player 1"] = new(null, null),
                    }),
            ],
            GpName: "SÃO   paulo grand prix!!!",
            RaceResults: null,
            SelectedMeetingKey: "missing",
            WeekendStateByMeetingKey: null);
        var calendar = new[]
        {
            CreateWeekendDocument("sao-paulo", "Sao Paulo", "Sao Paulo Grand Prix", 21, "2026-11-08", "2026-11-08"),
        };

        var result = sanitizer.Sanitize(appData, calendar, new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal("sao-paulo", result.SelectedMeetingKey);
        Assert.Equal("Sao Paulo Grand Prix", result.GpName);
        Assert.Equal(string.Empty, result.History!.Single().UserPredictions!["Player 1"].Prediction!.First);
        Assert.Equal("ver", result.WeekendStateByMeetingKey!["sao-paulo"].UserPredictions!["Player 1"].First);
    }

    [Fact]
    public void Private_helper_methods_cover_node_compatible_null_and_fallback_branches()
    {
        var sanitizer = new AppDataSanitizer();
        var sanitizedUser = InvokePrivateMethod<AppDataUserDocument>(sanitizer, "SanitizeUser", null, "Fallback");
        var normalizedUsers = InvokePrivateMethod<IReadOnlyList<AppDataUserDocument>>(
            sanitizer,
            "NormalizeUsersToRoster",
            new[]
            {
                new AppDataUserDocument(null, null, null),
                new AppDataUserDocument("Alpha", null, 1),
                new AppDataUserDocument("Beta", null, 2),
            },
            new[] { string.Empty, "Alpha", "Beta" });
        var unresolvedUsers = InvokePrivateMethod<IReadOnlyList<AppDataUserDocument>>(
            sanitizer,
            "NormalizeUsersToRoster",
            new[]
            {
                new AppDataUserDocument("Alpha", null, 1),
                new AppDataUserDocument("Beta", null, 2),
                new AppDataUserDocument("Gamma", null, 3),
            },
            new[] { "Alpha", "Beta", "Missing" });
        var resolveParticipantRoster = typeof(AppDataSanitizer)
            .GetMethod("ResolveParticipantRoster", BindingFlags.Static | BindingFlags.NonPublic)!;
        var unresolvedRoster = (IReadOnlyList<string>?)resolveParticipantRoster.Invoke(
            null,
            new object?[]
            {
                new[]
                {
                    new AppDataUserDocument(null, null, 1),
                    new AppDataUserDocument("Alpha", null, 2),
                    new AppDataUserDocument("Beta", null, 3),
                },
            });
        var sanitizedWeekendState = InvokePrivateMethod<WeekendPredictionStateDocument>(
            sanitizer,
            "SanitizeWeekendState",
            new WeekendPredictionStateDocument(null, null));
        var sanitizedNullWeekendState = InvokePrivateMethod<WeekendPredictionStateDocument>(
            sanitizer,
            "SanitizeWeekendState",
            (object?)null);
        var sanitizedNullRaceRecord = InvokePrivateMethod<AppDataHistoryRecordDocument>(
            sanitizer,
            "SanitizeRaceRecord",
            (object?)null);
        var builtWeekendState = InvokePrivateMethod<WeekendPredictionStateDocument>(
            sanitizer,
            "BuildWeekendStateFromUsers",
            new[]
            {
                new AppDataUserDocument(null, null, null),
                new AppDataUserDocument("Known", new PredictionDocument("ver", null, null, null), 1),
            },
            new PredictionDocument(null, null, null, null));
        var hydratedUsers = InvokePrivateMethod<IReadOnlyList<AppDataUserDocument>>(
            sanitizer,
            "HydrateUsersForSelectedWeekend",
            new[]
            {
                new AppDataUserDocument(null, null, 0),
                new AppDataUserDocument("Known", null, 1),
            },
            new WeekendPredictionStateDocument(
                new Dictionary<string, PredictionDocument>
                {
                    ["Known"] = new("ham", null, null, null),
                    [string.Empty] = new("pia", null, null, null),
                },
                null));
        var hydratedUsersWithNullState = InvokePrivateMethod<IReadOnlyList<AppDataUserDocument>>(
            sanitizer,
            "HydrateUsersForSelectedWeekend",
            new[]
            {
                new AppDataUserDocument("Missing", null, 0),
            },
            (object?)null);
        var resolvedByMeetingName = InvokePrivateMethod<WeekendDocument?>(
            sanitizer,
            "ResolveSelectedMeeting",
            new[]
            {
                CreateWeekendDocument("imola", "Emilia-Romagna Grand Prix", null!, 7, "2026-05-18", "2026-05-18"),
            },
            " ",
            "emilia romagna grand prix",
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));
        var nextUpcomingMeeting = InvokePrivateMethod<WeekendDocument>(
            sanitizer,
            "GetNextUpcomingMeeting",
            new[]
            {
                CreateWeekendDocument("past", "Past", "Past Grand Prix", 1, "2026-03-01", "2026-03-01"),
                CreateWeekendDocument("future", "Future", "Future Grand Prix", 2, "2026-04-01", null),
            },
            new DateTimeOffset(2026, 03, 12, 10, 00, 00, TimeSpan.Zero));

        Assert.Equal("Fallback", sanitizedUser.Name);
        Assert.Equal(0, sanitizedUser.Points);
        Assert.Equal(string.Empty, sanitizedUser.Predictions!.First);
        Assert.Null(normalizedUsers[0].Name);
        Assert.Same(unresolvedUsers[0], unresolvedUsers[0]);
        Assert.Null(unresolvedRoster);
        Assert.Empty(sanitizedWeekendState.UserPredictions!);
        Assert.Equal(string.Empty, sanitizedWeekendState.RaceResults!.Pole);
        Assert.Empty(sanitizedNullWeekendState.UserPredictions!);
        Assert.Equal(string.Empty, sanitizedNullWeekendState.RaceResults!.First);
        Assert.Equal(string.Empty, sanitizedNullRaceRecord.GpName);
        Assert.Null(sanitizedNullRaceRecord.MeetingKey);
        Assert.Empty(sanitizedNullRaceRecord.UserPredictions!);
        Assert.True(builtWeekendState.UserPredictions!.ContainsKey(string.Empty));
        Assert.Equal("ham", hydratedUsers[1].Predictions!.First);
        Assert.Equal("pia", hydratedUsers[0].Predictions!.First);
        Assert.Equal(string.Empty, hydratedUsersWithNullState[0].Predictions!.First);
        Assert.Equal("imola", resolvedByMeetingName!.MeetingKey);
        Assert.Equal("future", nextUpcomingMeeting.MeetingKey);
    }

    [Fact]
    public void Get_selected_weekend_state_returns_an_empty_state_when_the_key_is_missing()
    {
        var sanitizer = new AppDataSanitizer();

        var result = InvokePrivateMethod<WeekendPredictionStateDocument>(
            sanitizer,
            "GetSelectedWeekendState",
            new Dictionary<string, WeekendPredictionStateDocument>(),
            "missing");

        Assert.Empty(result.UserPredictions!);
        Assert.Equal(string.Empty, result.RaceResults!.First);
        Assert.Equal(string.Empty, result.RaceResults.Pole);
    }

    [Fact]
    public void Weekend_date_comparer_handles_reference_null_round_and_date_branches()
    {
        var weekend = CreateWeekendDocument("weekend-a", "Weekend A", "Grand Prix A", 2, "2026-04-01", "2026-04-02");
        var sameRoundEarlierDate = CreateWeekendDocument("weekend-b", "Weekend B", "Grand Prix B", 2, "2026-03-01", "2026-03-02");
        var missingRoundInvalidDate = CreateWeekendDocument("weekend-c", "Weekend C", "Grand Prix C", null, "not-a-date", "still-not-a-date");
        var endDateOnlyWeekend = CreateWeekendDocument("weekend-e", "Weekend E", "Grand Prix E", null, null, "2026-03-05");

        Assert.Equal(0, CompareWeekendDates(weekend, weekend));
        Assert.Equal(-1, CompareWeekendDates(null, weekend));
        Assert.Equal(1, CompareWeekendDates(weekend, null));
        Assert.True(CompareWeekendDates(weekend, sameRoundEarlierDate) > 0);
        Assert.True(CompareWeekendDates(sameRoundEarlierDate, missingRoundInvalidDate) < 0);
        Assert.True(CompareWeekendDates(missingRoundInvalidDate, sameRoundEarlierDate) > 0);
        Assert.True(CompareWeekendDates(endDateOnlyWeekend, missingRoundInvalidDate) < 0);
        Assert.True(CompareWeekendDates(missingRoundInvalidDate, endDateOnlyWeekend) > 0);
        Assert.Equal(0, CompareWeekendDates(missingRoundInvalidDate, CreateWeekendDocument("weekend-d", "Weekend D", "Grand Prix D", null, "bad-date", "bad-date")));
    }

    private static int CompareWeekendDates(WeekendDocument? firstWeekend, WeekendDocument? secondWeekend)
    {
        var comparerType = typeof(AppDataSanitizer).GetNestedType("WeekendDateComparer", BindingFlags.NonPublic)!;
        var instance = comparerType.GetProperty("Instance", BindingFlags.Public | BindingFlags.Static)!.GetValue(null)!;
        return InvokePrivateMethod<int>(instance, "Compare", firstWeekend, secondWeekend);
    }

    private static T InvokePrivateMethod<T>(object instance, string methodName, params object?[] arguments)
    {
        var argumentTypes = arguments
            .Select(argument => argument?.GetType() ?? typeof(object))
            .ToArray();
        var method = instance.GetType()
            .GetMethods(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .SingleOrDefault(candidate =>
            {
                if (!string.Equals(candidate.Name, methodName, StringComparison.Ordinal))
                {
                    return false;
                }

                var parameters = candidate.GetParameters();
                if (parameters.Length != argumentTypes.Length)
                {
                    return false;
                }

                return parameters.Zip(argumentTypes, static (parameter, argumentType) =>
                        parameter.ParameterType.IsAssignableFrom(argumentType) || argumentType == typeof(object))
                    .All(static isMatch => isMatch);
            });

        Assert.NotNull(method);

        return (T)method!.Invoke(instance, arguments)!;
    }

    private static WeekendDocument CreateWeekendDocument(
        string meetingKey,
        string meetingName,
        string grandPrixTitle,
        int? roundNumber,
        string? startDate,
        string? endDate)
    {
        return new WeekendDocument(
            meetingKey,
            meetingName,
            grandPrixTitle,
            roundNumber,
            null,
            null,
            null,
            null,
            false,
            startDate,
            endDate,
            null,
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty);
    }
}
