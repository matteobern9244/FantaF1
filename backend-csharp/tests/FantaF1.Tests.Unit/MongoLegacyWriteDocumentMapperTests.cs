using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Mongo;
using MongoDB.Bson;

namespace FantaF1.Tests.Unit;

public sealed class MongoLegacyWriteDocumentMapperTests
{
    [Fact]
    public void Map_app_data_rejects_a_null_document()
    {
        var mapper = new MongoLegacyWriteDocumentMapper();

        Assert.Throws<ArgumentNullException>(() => mapper.MapAppData(null!, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Map_app_data_preserves_existing_metadata_and_overwrites_the_node_compatible_fields()
    {
        var mapper = new MongoLegacyWriteDocumentMapper();
        var existingDocument = new BsonDocument
        {
            ["_id"] = 42,
            ["legacyField"] = "keep-me",
            ["createdAt"] = new BsonDateTime(new DateTime(2026, 03, 10, 00, 00, 00, DateTimeKind.Utc)),
        };

        var result = mapper.MapAppData(
            CreateDocument(),
            new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero),
            existingDocument);

        Assert.Equal(42, result["_id"].AsInt32);
        Assert.Equal("keep-me", result["legacyField"].AsString);
        Assert.Equal("Race 1", result["gpName"].AsString);
        Assert.Equal("race-1", result["selectedMeetingKey"].AsString);
        Assert.Equal("ver", result["users"][0]["predictions"]["first"].AsString);
        Assert.Equal(new DateTime(2026, 03, 10, 00, 00, 00, DateTimeKind.Utc), result["createdAt"].ToUniversalTime());
        Assert.True(result.Contains("updatedAt"));
        Assert.True(result.Contains("lastUpdated"));
    }

    [Fact]
    public void Map_app_data_maps_history_and_empty_weekend_state_shapes()
    {
        var mapper = new MongoLegacyWriteDocumentMapper();
        var document = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
            ],
            History:
            [
                new AppDataHistoryRecordDocument(
                    "Historic GP",
                    MeetingKey: null,
                    Date: "01/03/2026",
                    Results: new PredictionDocument("ver", "ham", "lec", "nor"),
                    UserPredictions: new Dictionary<string, AppDataHistoryUserPredictionDocument>
                    {
                        ["Adriano"] = new(new PredictionDocument("ver", "", "", ""), 5),
                    }),
            ],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("", "", "", ""),
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>());

        var result = mapper.MapAppData(document, new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        Assert.True(result["history"][0]["meetingKey"].IsBsonNull);
        Assert.Equal(5, result["history"][0]["userPredictions"]["Adriano"]["pointsEarned"].AsDouble);
        Assert.Empty(result["weekendStateByMeetingKey"].AsBsonDocument);
    }

    [Fact]
    public void Map_app_data_defaults_null_top_level_and_nested_values_to_node_compatible_shapes()
    {
        var mapper = new MongoLegacyWriteDocumentMapper();
        var document = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument(null, new PredictionDocument(null, "ham", null, "pole"), null),
            ],
            History:
            [
                new AppDataHistoryRecordDocument(
                    null,
                    MeetingKey: "race-1",
                    Date: null,
                    Results: null,
                    UserPredictions: null),
            ],
            GpName: null,
            RaceResults: null,
            SelectedMeetingKey: null,
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = new(
                    null,
                    new PredictionDocument(null, null, "lec", null)),
            });

        var result = mapper.MapAppData(document, new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        Assert.Equal(string.Empty, result["gpName"].AsString);
        Assert.Equal(string.Empty, result["selectedMeetingKey"].AsString);
        Assert.Equal(string.Empty, result["users"][0]["name"].AsString);
        Assert.Equal(0, result["users"][0]["points"].AsDouble);
        Assert.Equal(string.Empty, result["users"][0]["predictions"]["first"].AsString);
        Assert.Equal("ham", result["users"][0]["predictions"]["second"].AsString);
        Assert.Equal(string.Empty, result["history"][0]["gpName"].AsString);
        Assert.Equal(string.Empty, result["history"][0]["date"].AsString);
        Assert.Empty(result["history"][0]["userPredictions"].AsBsonDocument);
        Assert.Equal(string.Empty, result["history"][0]["results"]["first"].AsString);
        Assert.Empty(result["weekendStateByMeetingKey"]["race-1"]["userPredictions"].AsBsonDocument);
        Assert.Equal("lec", result["weekendStateByMeetingKey"]["race-1"]["raceResults"]["third"].AsString);
    }

    [Fact]
    public void Map_app_data_defaults_null_collections_when_payload_sections_are_missing()
    {
        var mapper = new MongoLegacyWriteDocumentMapper();
        var document = new AppDataDocument(
            Users: null,
            History: null,
            GpName: null,
            RaceResults: null,
            SelectedMeetingKey: null,
            WeekendStateByMeetingKey: null);

        var result = mapper.MapAppData(document, new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        Assert.Empty(result["users"].AsBsonArray);
        Assert.Empty(result["history"].AsBsonArray);
        Assert.Equal(string.Empty, result["raceResults"]["pole"].AsString);
        Assert.Empty(result["weekendStateByMeetingKey"].AsBsonDocument);
    }

    [Fact]
    public void Map_driver_covers_complete_and_null_compatible_shapes()
    {
        var mapper = new MongoLegacyWriteDocumentMapper();

        Assert.Throws<ArgumentNullException>(() => mapper.MapDriver(null!));

        var complete = mapper.MapDriver(new DriverDocument("ver", "Max Verstappen", "Red Bull", "#0600EF", "avatar.webp", "redbullracing"));
        var empty = mapper.MapDriver(new DriverDocument(null!, null!, null!, null!, null!, null!));

        Assert.Equal("ver", complete["id"].AsString);
        Assert.Equal("avatar.webp", complete["avatarUrl"].AsString);
        Assert.Equal("redbullracing", complete["teamSlug"].AsString);
        Assert.Equal(string.Empty, empty["id"].AsString);
        Assert.Equal(string.Empty, empty["name"].AsString);
        Assert.Equal(string.Empty, empty["team"].AsString);
        Assert.Equal(string.Empty, empty["color"].AsString);
        Assert.Equal(string.Empty, empty["avatarUrl"].AsString);
        Assert.Equal(string.Empty, empty["teamSlug"].AsString);
    }

    [Fact]
    public void Map_weekend_covers_complete_and_null_compatible_shapes()
    {
        var mapper = new MongoLegacyWriteDocumentMapper();

        Assert.Throws<ArgumentNullException>(() => mapper.MapWeekend(null!));

        var complete = mapper.MapWeekend(
            new WeekendDocument(
                "1280",
                "China",
                "FORMULA 1 CHINESE GRAND PRIX 2026",
                2,
                "20 - 22 MAR",
                "https://www.formula1.com/en/racing/2026/china",
                "hero.webp",
                "track.webp",
                true,
                "2026-03-20",
                "2026-03-22",
                "2026-03-22T07:00:00Z",
                [new WeekendSessionDocument("Race", "2026-03-22T07:00:00Z"), new WeekendSessionDocument(null!, null!)],
                "https://youtube.com/watch?v=sky",
                "2026-03-22T10:00:00.000Z",
                "found",
                "feed"));
        var empty = mapper.MapWeekend(
            new WeekendDocument(
                null!,
                null!,
                null!,
                null!,
                null!,
                null!,
                null!,
                null!,
                false,
                null!,
                null!,
                null!,
                null!,
                null!,
                null!,
                null!,
                null!));

        Assert.Equal("1280", complete["meetingKey"].AsString);
        Assert.True(complete["isSprintWeekend"].AsBoolean);
        Assert.Equal("Race", complete["sessions"][0]["name"].AsString);
        Assert.Equal(string.Empty, complete["sessions"][1]["name"].AsString);
        Assert.Equal(string.Empty, empty["meetingKey"].AsString);
        Assert.Equal(0, empty["roundNumber"].AsInt32);
        Assert.Equal(string.Empty, empty["raceStartTime"].AsString);
        Assert.Empty(empty["sessions"].AsBsonArray);
        Assert.Equal(string.Empty, empty["highlightsLookupSource"].AsString);
    }

    private static AppDataDocument CreateDocument()
    {
        return new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument("ver", "", "", ""), 1),
                new AppDataUserDocument("Fabio", new PredictionDocument("", "ham", "", ""), 2),
                new AppDataUserDocument("Matteo", new PredictionDocument("", "", "lec", "nor"), 3),
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
                        ["Adriano"] = new("ver", "", "", ""),
                        ["Fabio"] = new("", "", "", ""),
                        ["Matteo"] = new("", "", "", ""),
                    },
                    new PredictionDocument("", "", "", "")),
            });
    }
}
