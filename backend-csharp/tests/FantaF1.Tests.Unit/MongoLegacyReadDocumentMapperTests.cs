using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Mongo;
using MongoDB.Bson;
using System.Reflection;

namespace FantaF1.Tests.Unit;

public sealed class MongoLegacyReadDocumentMapperTests
{
    [Fact]
    public void Mapper_rejects_null_documents()
    {
        var mapper = new MongoLegacyReadDocumentMapper();

        Assert.Throws<ArgumentNullException>(() => mapper.MapAppData(null!));
        Assert.Throws<ArgumentNullException>(() => mapper.MapDriver(null!));
        Assert.Throws<ArgumentNullException>(() => mapper.MapWeekend(null!));
    }

    [Fact]
    public void Mapper_reads_legacy_app_data_documents_with_dynamic_dictionary_shapes()
    {
        var mapper = new MongoLegacyReadDocumentMapper();
        var document = new BsonDocument
        {
            ["users"] = new BsonArray
            {
                new BsonDocument
                {
                    ["name"] = string.Empty,
                    ["points"] = "NaN",
                    ["predictions"] = new BsonDocument
                    {
                        ["first"] = "ver",
                        ["second"] = 1,
                    },
                },
            },
            ["history"] = new BsonArray
            {
                new BsonDocument
                {
                    ["gpName"] = "Historic GP",
                    ["meetingKey"] = "historic",
                    ["date"] = "01/01/2026",
                    ["results"] = new BsonDocument
                    {
                        ["first"] = "ver",
                        ["second"] = "ham",
                        ["third"] = "lec",
                        ["pole"] = "nor",
                    },
                    ["userPredictions"] = new BsonDocument
                    {
                        ["Player 1"] = new BsonDocument
                        {
                            ["prediction"] = new BsonDocument
                            {
                                ["first"] = "ver",
                            },
                            ["pointsEarned"] = "NaN",
                        },
                    },
                },
            },
            ["gpName"] = "Monaco Grand Prix",
            ["selectedMeetingKey"] = "monaco",
            ["weekendStateByMeetingKey"] = new BsonDocument
            {
                ["monaco"] = new BsonDocument
                {
                    ["userPredictions"] = new BsonDocument
                    {
                        ["Player 1"] = new BsonDocument
                        {
                            ["first"] = "ham",
                        },
                    },
                    ["raceResults"] = new BsonDocument
                    {
                        ["pole"] = "pia",
                    },
                },
            },
        };

        var result = mapper.MapAppData(document);

        Assert.Equal("Monaco Grand Prix", result.GpName);
        Assert.Equal("monaco", result.SelectedMeetingKey);
        Assert.Equal("ver", result.Users!.Single().Predictions!.First);
        Assert.Equal("historic", result.History!.Single().MeetingKey);
        Assert.Equal("ham", result.WeekendStateByMeetingKey!["monaco"].UserPredictions!["Player 1"].First);
    }

    [Fact]
    public void Mapper_reads_driver_and_weekend_documents_without_silently_renaming_legacy_fields()
    {
        var mapper = new MongoLegacyReadDocumentMapper();
        var driverDocument = new BsonDocument
        {
            ["id"] = "lec",
            ["name"] = "Charles Leclerc",
            ["team"] = "Ferrari",
            ["color"] = "red",
            ["avatarUrl"] = "https://example.test/lec.webp",
            ["teamSlug"] = "ferrari",
        };
        var weekendDocument = new BsonDocument
        {
            ["meetingKey"] = "race-1",
            ["meetingName"] = "Australia",
            ["grandPrixTitle"] = "Australian Grand Prix",
            ["roundNumber"] = 1,
            ["sessions"] = new BsonArray
            {
                new BsonDocument
                {
                    ["name"] = "Race",
                    ["startTime"] = "2026-03-08T14:00:00Z",
                },
            },
        };

        var driver = mapper.MapDriver(driverDocument);
        var weekend = mapper.MapWeekend(weekendDocument);

        Assert.Equal("lec", driver.Id);
        Assert.Equal("Charles Leclerc", driver.Name);
        Assert.Equal("Ferrari", driver.Team);
        Assert.Equal("race-1", weekend.MeetingKey);
        Assert.Equal("Australian Grand Prix", weekend.GrandPrixTitle);
        Assert.Equal("Race", weekend.Sessions.Single().Name);
    }

    [Fact]
    public void Mapper_returns_empty_or_default_values_when_legacy_fields_are_missing_or_malformed()
    {
        var mapper = new MongoLegacyReadDocumentMapper();
        var appDataDocument = new BsonDocument
        {
            ["users"] = "not-an-array",
            ["history"] = "not-an-array",
            ["gpName"] = BsonNull.Value,
            ["raceResults"] = "not-a-document",
            ["selectedMeetingKey"] = 123,
            ["weekendStateByMeetingKey"] = "not-a-document",
        };
        var driverDocument = new BsonDocument
        {
            ["id"] = 1,
            ["name"] = BsonNull.Value,
            ["team"] = 2,
            ["color"] = BsonNull.Value,
        };
        var weekendDocument = new BsonDocument
        {
            ["meetingKey"] = BsonNull.Value,
            ["meetingName"] = 1,
            ["roundNumber"] = "invalid",
            ["isSprintWeekend"] = BsonNull.Value,
            ["sessions"] = "not-an-array",
            ["highlightsVideoUrl"] = BsonNull.Value,
            ["highlightsLookupCheckedAt"] = BsonNull.Value,
            ["highlightsLookupStatus"] = BsonNull.Value,
            ["highlightsLookupSource"] = BsonNull.Value,
        };

        var appData = mapper.MapAppData(appDataDocument);
        var driver = mapper.MapDriver(driverDocument);
        var weekend = mapper.MapWeekend(weekendDocument);

        Assert.Empty(appData.Users!);
        Assert.Empty(appData.History!);
        Assert.Null(appData.GpName);
        Assert.Null(appData.RaceResults);
        Assert.Null(appData.SelectedMeetingKey);
        Assert.Empty(appData.WeekendStateByMeetingKey!);
        Assert.Equal(string.Empty, driver.Id);
        Assert.Equal(string.Empty, driver.Name);
        Assert.Null(driver.Team);
        Assert.Null(driver.Color);
        Assert.Equal(string.Empty, weekend.MeetingKey);
        Assert.Null(weekend.MeetingName);
        Assert.Null(weekend.RoundNumber);
        Assert.False(weekend.IsSprintWeekend);
        Assert.Empty(weekend.Sessions);
        Assert.Equal(string.Empty, weekend.HighlightsVideoUrl);
        Assert.Equal(string.Empty, weekend.HighlightsLookupCheckedAt);
        Assert.Equal(string.Empty, weekend.HighlightsLookupStatus);
        Assert.Equal(string.Empty, weekend.HighlightsLookupSource);
    }

    [Fact]
    public void Mapper_reads_numeric_and_boolean_legacy_variants()
    {
        var mapper = new MongoLegacyReadDocumentMapper();
        var appDataDocument = new BsonDocument
        {
            ["users"] = new BsonArray
            {
                new BsonDocument
                {
                    ["name"] = "Double User",
                    ["points"] = 12.5,
                },
                new BsonDocument
                {
                    ["name"] = "Int32 User",
                    ["points"] = 8,
                },
                new BsonDocument
                {
                    ["name"] = "Int64 User",
                    ["points"] = 9L,
                },
                new BsonDocument
                {
                    ["name"] = "String User",
                    ["points"] = "10.5",
                },
                new BsonDocument
                {
                    ["name"] = "Invalid User",
                    ["points"] = "not-a-number",
                },
            },
            ["history"] = new BsonArray
            {
                new BsonDocument
                {
                    ["userPredictions"] = new BsonDocument
                    {
                        ["Player 1"] = new BsonDocument
                        {
                            ["pointsEarned"] = 1,
                        },
                        ["Player 2"] = new BsonDocument
                        {
                            ["pointsEarned"] = 2L,
                        },
                        ["Player 3"] = new BsonDocument
                        {
                            ["pointsEarned"] = "3.5",
                        },
                    },
                },
            },
        };

        var boolWeekend = mapper.MapWeekend(new BsonDocument
        {
            ["meetingKey"] = "weekend-bool",
            ["roundNumber"] = 7,
            ["isSprintWeekend"] = true,
        });
        var int32Weekend = mapper.MapWeekend(new BsonDocument
        {
            ["meetingKey"] = "weekend-int32",
            ["roundNumber"] = 8,
            ["isSprintWeekend"] = 1,
        });
        var int64Weekend = mapper.MapWeekend(new BsonDocument
        {
            ["meetingKey"] = "weekend-int64",
            ["roundNumber"] = 9L,
            ["isSprintWeekend"] = 1L,
        });
        var stringWeekend = mapper.MapWeekend(new BsonDocument
        {
            ["meetingKey"] = "weekend-string",
            ["roundNumber"] = "10",
            ["isSprintWeekend"] = "true",
        });

        var appData = mapper.MapAppData(appDataDocument);

        Assert.Equal([12.5, 8, 9, 10.5, null], appData.Users!.Select(user => user.Points).ToArray());
        Assert.Equal([1, 2, 3.5], appData.History!.Single().UserPredictions!.Values.Select(value => value.PointsEarned).ToArray());
        Assert.Equal(7, boolWeekend.RoundNumber);
        Assert.True(boolWeekend.IsSprintWeekend);
        Assert.Equal(8, int32Weekend.RoundNumber);
        Assert.True(int32Weekend.IsSprintWeekend);
        Assert.Equal(9, int64Weekend.RoundNumber);
        Assert.True(int64Weekend.IsSprintWeekend);
        Assert.Equal(10, stringWeekend.RoundNumber);
        Assert.True(stringWeekend.IsSprintWeekend);
    }

    [Fact]
    public void Mapper_throws_when_a_legacy_dictionary_entry_maps_to_null()
    {
        var mapper = new MongoLegacyReadDocumentMapper();
        var document = new BsonDocument
        {
            ["weekendStateByMeetingKey"] = new BsonDocument
            {
                ["monaco"] = new BsonDocument
                {
                    ["userPredictions"] = new BsonDocument
                    {
                        ["Player 1"] = "not-a-document",
                    },
                },
            },
        };

        var exception = Assert.Throws<InvalidOperationException>(() => mapper.MapAppData(document));

        Assert.Equal("Legacy Mongo document mapper returned a null value for a dictionary entry.", exception.Message);
    }

    [Fact]
    public void Mapper_returns_null_numeric_values_when_legacy_fields_are_missing_and_false_for_false_boolean_strings()
    {
        var mapper = new MongoLegacyReadDocumentMapper();
        var appData = mapper.MapAppData(new BsonDocument
        {
            ["users"] = new BsonArray
            {
                new BsonDocument
                {
                    ["name"] = "Player 1",
                },
            },
        });
        var weekend = mapper.MapWeekend(new BsonDocument
        {
            ["meetingKey"] = "weekend-1",
            ["isSprintWeekend"] = "false",
        });
        var invalidWeekend = mapper.MapWeekend(new BsonDocument
        {
            ["meetingKey"] = "weekend-2",
            ["isSprintWeekend"] = "not-a-boolean",
        });
        var unsupportedTypeWeekend = mapper.MapWeekend(new BsonDocument
        {
            ["meetingKey"] = "weekend-3",
            ["isSprintWeekend"] = new BsonArray(),
        });

        Assert.Null(appData.Users!.Single().Points);
        Assert.Null(weekend.RoundNumber);
        Assert.False(weekend.IsSprintWeekend);
        Assert.False(invalidWeekend.IsSprintWeekend);
        Assert.False(unsupportedTypeWeekend.IsSprintWeekend);
    }

    [Fact]
    public void Read_dictionary_throws_when_the_mapper_returns_null()
    {
        var readDictionary = typeof(MongoLegacyReadDocumentMapper)
            .GetMethod("ReadDictionary", BindingFlags.Static | BindingFlags.NonPublic)!
            .MakeGenericMethod(typeof(string));
        var document = new BsonDocument
        {
            ["field"] = new BsonDocument
            {
                ["key"] = "value",
            },
        };

        var exception = Assert.Throws<TargetInvocationException>(() =>
            readDictionary.Invoke(null, [document, "field", new Func<BsonValue, string?>(_ => null)]));

        Assert.IsType<InvalidOperationException>(exception.InnerException);
        Assert.Equal(
            "Legacy Mongo document mapper returned a null value for a dictionary entry.",
            exception.InnerException!.Message);
    }
}
