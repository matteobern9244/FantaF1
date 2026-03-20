using System.Reflection;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.SaveValidation;
using FantaF1.Infrastructure.Mongo;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace FantaF1.Tests.Unit;

public sealed class MongoWriteRepositoryTests
{
    [Theory]
    [InlineData("mapper")]
    [InlineData("writeMapper")]
    [InlineData("participantRosterValidator")]
    [InlineData("clock")]
    public void Mongo_app_data_repository_constructor_rejects_null_dependencies(string parameterName)
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [],
        });

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "mapper" => new MongoAppDataRepository(
                harness.Database,
                null!,
                new MongoLegacyWriteDocumentMapper(),
                new ParticipantRosterValidator(),
                new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero))),
            "writeMapper" => new MongoAppDataRepository(
                harness.Database,
                new MongoLegacyReadDocumentMapper(),
                null!,
                new ParticipantRosterValidator(),
                new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero))),
            "participantRosterValidator" => new MongoAppDataRepository(
                harness.Database,
                new MongoLegacyReadDocumentMapper(),
                new MongoLegacyWriteDocumentMapper(),
                null!,
                new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero))),
            "clock" => new MongoAppDataRepository(
                harness.Database,
                new MongoLegacyReadDocumentMapper(),
                new MongoLegacyWriteDocumentMapper(),
                new ParticipantRosterValidator(),
                null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Mongo_app_data_repository_reads_the_persisted_participant_roster_from_the_latest_document()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] =
            [
                new BsonDocument
                {
                    ["createdAt"] = new BsonDateTime(new DateTime(2026, 03, 12, 00, 00, 00, DateTimeKind.Utc)),
                    ["users"] = new BsonArray
                    {
                        new BsonDocument { ["name"] = "Adriano" },
                        new BsonDocument { ["name"] = "Fabio" },
                        new BsonDocument { ["name"] = "Matteo" },
                    },
                },
            ],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        var roster = await repository.ReadPersistedParticipantRosterAsync(CancellationToken.None);

        Assert.Equal(["Adriano", "Fabio", "Matteo"], roster);
    }

    [Fact]
    public async Task Mongo_app_data_repository_returns_null_when_no_latest_document_exists_for_the_roster()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        var roster = await repository.ReadPersistedParticipantRosterAsync(CancellationToken.None);

        Assert.Null(roster);
    }

    [Fact]
    public async Task Mongo_app_data_repository_returns_null_when_the_roster_read_throws()
    {
        var harness = CreateThrowingDatabase();
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        var roster = await repository.ReadPersistedParticipantRosterAsync(CancellationToken.None);

        Assert.Null(roster);
    }

    [Fact]
    public async Task Mongo_app_data_repository_merges_the_latest_document_shape_when_writing()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] =
            [
                new BsonDocument
                {
                    ["_id"] = 7,
                    ["createdAt"] = new BsonDateTime(new DateTime(2026, 03, 10, 00, 00, 00, DateTimeKind.Utc)),
                    ["legacyField"] = "preserved",
                    ["gpName"] = "Old Grand Prix",
                },
            ],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        await repository.WriteAsync(
            new AppDataDocument(
                Users:
                [
                    new AppDataUserDocument("Adriano", new PredictionDocument("ver", "", "", ""), 0),
                    new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
                    new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
                ],
                History: [],
                GpName: "New Grand Prix",
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
                }),
            CancellationToken.None);

        Assert.NotNull(harness.ReplacedDocument);
        Assert.Equal("preserved", harness.ReplacedDocument!["legacyField"].AsString);
        Assert.Equal("New Grand Prix", harness.ReplacedDocument["gpName"].AsString);
        Assert.Equal("race-1", harness.ReplacedDocument["selectedMeetingKey"].AsString);
        Assert.True(harness.ReplacedDocument.Contains("lastUpdated"));
        Assert.True(harness.ReplacedDocument.Contains("updatedAt"));
        Assert.Equal("ver", harness.ReplacedDocument["weekendStateByMeetingKey"]["race-1"]["userPredictions"]["Adriano"]["first"].AsString);
    }

    [Fact]
    public async Task Mongo_app_data_repository_inserts_a_new_document_when_the_collection_is_empty()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        await repository.WriteAsync(
            new AppDataDocument([], [], string.Empty, new PredictionDocument("", "", "", ""), string.Empty, null),
            CancellationToken.None);

        Assert.NotNull(harness.ReplacedDocument);
        Assert.True(harness.ReplacedDocument!.Contains("createdAt"));
    }

    [Fact]
    public async Task Mongo_app_data_repository_write_rejects_a_null_document()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        await Assert.ThrowsAsync<ArgumentNullException>(() => repository.WriteAsync(null!, CancellationToken.None));
    }

    [Fact]
    public async Task Mongo_weekend_repository_writes_only_the_legacy_highlights_lookup_fields()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] =
            [
                new BsonDocument
                {
                    ["meetingKey"] = "race-1",
                    ["meetingName"] = "Race 1",
                    ["roundNumber"] = 1,
                },
            ],
        });
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        await repository.WriteHighlightsLookupAsync(
            "race-1",
            new HighlightsLookupDocument(
                "https://www.youtube.com/watch?v=skyf1-finished",
                "2026-03-01T15:00:00.000Z",
                "found",
                "feed"),
            CancellationToken.None);

        Assert.NotNull(harness.RenderedUpdate);
        Assert.Equal("https://www.youtube.com/watch?v=skyf1-finished", harness.RenderedUpdate!["$set"]["highlightsVideoUrl"].AsString);
        Assert.Equal("2026-03-01T15:00:00.000Z", harness.RenderedUpdate["$set"]["highlightsLookupCheckedAt"].AsString);
        Assert.Equal("found", harness.RenderedUpdate["$set"]["highlightsLookupStatus"].AsString);
        Assert.Equal("feed", harness.RenderedUpdate["$set"]["highlightsLookupSource"].AsString);
    }

    [Fact]
    public async Task Mongo_weekend_repository_write_rejects_invalid_arguments()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] = [],
        });
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        await Assert.ThrowsAsync<ArgumentException>(() => repository.WriteHighlightsLookupAsync("", new HighlightsLookupDocument("", "", "", ""), CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentNullException>(() => repository.WriteHighlightsLookupAsync("race-1", null!, CancellationToken.None));
    }

    [Fact]
    public async Task Mongo_weekend_repository_converts_null_highlights_fields_to_empty_strings()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] =
            [
                new BsonDocument { ["meetingKey"] = "race-1", ["roundNumber"] = 1 },
            ],
        });
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        await repository.WriteHighlightsLookupAsync(
            "race-1",
            new HighlightsLookupDocument(null!, null!, null!, null!),
            CancellationToken.None);

        Assert.NotNull(harness.RenderedUpdate);
        Assert.Equal(string.Empty, harness.RenderedUpdate!["$set"]["highlightsVideoUrl"].AsString);
        Assert.Equal(string.Empty, harness.RenderedUpdate["$set"]["highlightsLookupCheckedAt"].AsString);
        Assert.Equal(string.Empty, harness.RenderedUpdate["$set"]["highlightsLookupStatus"].AsString);
        Assert.Equal(string.Empty, harness.RenderedUpdate["$set"]["highlightsLookupSource"].AsString);
    }

    [Fact]
    public async Task Mongo_weekend_repository_does_not_remove_persisted_found_highlights_when_a_new_lookup_is_missing()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] =
            [
                new BsonDocument
                {
                    ["meetingKey"] = "race-1",
                    ["roundNumber"] = 1,
                    ["highlightsVideoUrl"] = "https://www.youtube.com/watch?v=persisted-found",
                    ["highlightsLookupCheckedAt"] = "2026-03-01T15:00:00.000Z",
                    ["highlightsLookupStatus"] = "found",
                    ["highlightsLookupSource"] = "feed",
                },
            ],
        });
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        await repository.WriteHighlightsLookupAsync(
            "race-1",
            new HighlightsLookupDocument(
                string.Empty,
                "2026-03-02T09:00:00.000Z",
                "missing",
                string.Empty),
            CancellationToken.None);

        Assert.NotNull(harness.RenderedUpdate);
        Assert.Equal("https://www.youtube.com/watch?v=persisted-found", harness.RenderedUpdate!["$set"]["highlightsVideoUrl"].AsString);
        Assert.Equal("2026-03-01T15:00:00.000Z", harness.RenderedUpdate["$set"]["highlightsLookupCheckedAt"].AsString);
        Assert.Equal("found", harness.RenderedUpdate["$set"]["highlightsLookupStatus"].AsString);
        Assert.Equal("feed", harness.RenderedUpdate["$set"]["highlightsLookupSource"].AsString);
    }

    [Fact]
    public async Task Mongo_weekend_repository_preserves_persisted_highlights_even_when_existing_metadata_fields_are_null()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] =
            [
                new BsonDocument
                {
                    ["meetingKey"] = "race-1",
                    ["roundNumber"] = 1,
                    ["highlightsVideoUrl"] = "https://www.youtube.com/watch?v=persisted-found",
                    ["highlightsLookupCheckedAt"] = BsonNull.Value,
                    ["highlightsLookupStatus"] = BsonNull.Value,
                    ["highlightsLookupSource"] = BsonNull.Value,
                },
            ],
        });
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        await repository.WriteHighlightsLookupAsync(
            "race-1",
            new HighlightsLookupDocument(
                string.Empty,
                "2026-03-02T09:00:00.000Z",
                "missing",
                string.Empty),
            CancellationToken.None);

        Assert.NotNull(harness.RenderedUpdate);
        Assert.Equal("https://www.youtube.com/watch?v=persisted-found", harness.RenderedUpdate!["$set"]["highlightsVideoUrl"].AsString);
        Assert.Equal(string.Empty, harness.RenderedUpdate["$set"]["highlightsLookupCheckedAt"].AsString);
        Assert.Equal(string.Empty, harness.RenderedUpdate["$set"]["highlightsLookupStatus"].AsString);
        Assert.Equal(string.Empty, harness.RenderedUpdate["$set"]["highlightsLookupSource"].AsString);
    }

    [Fact]
    public async Task Mongo_weekend_repository_allows_missing_lookup_writes_when_no_persisted_document_exists()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] = [],
        });
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        await repository.WriteHighlightsLookupAsync(
            "race-1",
            new HighlightsLookupDocument(
                string.Empty,
                "2026-03-02T09:00:00.000Z",
                "missing",
                string.Empty),
            CancellationToken.None);

        Assert.NotNull(harness.RenderedUpdate);
        Assert.Equal(string.Empty, harness.RenderedUpdate!["$set"]["highlightsVideoUrl"].AsString);
        Assert.Equal("2026-03-02T09:00:00.000Z", harness.RenderedUpdate["$set"]["highlightsLookupCheckedAt"].AsString);
        Assert.Equal("missing", harness.RenderedUpdate["$set"]["highlightsLookupStatus"].AsString);
        Assert.Equal(string.Empty, harness.RenderedUpdate["$set"]["highlightsLookupSource"].AsString);
    }

    [Fact]
    public async Task Mongo_app_data_repository_add_calls_write()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        await repository.AddAsync(
            new AppDataDocument([], [], string.Empty, new PredictionDocument("", "", "", ""), string.Empty, null),
            CancellationToken.None);

        Assert.NotNull(harness.ReplacedDocument);
    }

    [Fact]
    public async Task Mongo_app_data_repository_update_calls_write()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [new BsonDocument { ["_id"] = 1, ["createdAt"] = DateTime.UtcNow }],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        await repository.UpdateAsync(
            new AppDataDocument([], [], string.Empty, new PredictionDocument("", "", "", ""), string.Empty, null),
            CancellationToken.None);

        Assert.NotNull(harness.ReplacedDocument);
    }

    [Fact]
    public async Task Mongo_app_data_repository_get_by_id_reads_latest()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] =
            [
                new BsonDocument
                {
                    ["createdAt"] = new BsonDateTime(new DateTime(2026, 03, 12, 00, 00, 00, DateTimeKind.Utc)),
                    ["gpName"] = "Target GP",
                },
            ],
        });
        var repository = new MongoAppDataRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        var result = await repository.GetByIdAsync("any", CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Target GP", result!.GpName);
    }

    private static MongoDatabaseHarness CreateDatabase(IReadOnlyDictionary<string, IReadOnlyList<BsonDocument>> documentsByCollection)
    {
        var requestedCollectionNames = new List<string>();
        BsonDocument? replacedDocument = null;
        BsonDocument? renderedUpdate = null;
        IMongoDatabase? database = null;
        database = ProxyFactory<IMongoDatabase>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoDatabase.GetCollection))
            {
                var collectionName = (string)args![0]!;
                requestedCollectionNames.Add(collectionName);
                var documents = documentsByCollection.TryGetValue(collectionName, out var value)
                    ? value
                    : [];

                return CreateCollection(database!, collectionName, documents, document => replacedDocument = document, update => renderedUpdate = update);
            }

            if (method.Name == "get_DatabaseNamespace")
            {
                return new DatabaseNamespace("fantaf1_porting_tests");
            }

            throw new NotSupportedException($"Unexpected IMongoDatabase call: {method.Name}");
        });

        return new MongoDatabaseHarness(database, requestedCollectionNames, () => replacedDocument, () => renderedUpdate);
    }

    private static MongoDatabaseHarness CreateThrowingDatabase()
    {
        IMongoDatabase? database = null;
        database = ProxyFactory<IMongoDatabase>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoDatabase.GetCollection))
            {
                return ProxyFactory<IMongoCollection<BsonDocument>>.Create((collectionMethod, _) =>
                {
                    if (collectionMethod.Name == nameof(IMongoCollection<BsonDocument>.FindAsync))
                    {
                        throw new InvalidOperationException("read failed");
                    }

                    if (collectionMethod.Name == "get_CollectionNamespace")
                    {
                        return new CollectionNamespace(new DatabaseNamespace("fantaf1_porting_tests"), MongoCollectionNames.AppDatas);
                    }

                    if (collectionMethod.Name == "get_Database")
                    {
                        return database!;
                    }

                    if (collectionMethod.Name == "get_DocumentSerializer")
                    {
                        return BsonDocumentSerializer.Instance;
                    }

                    if (collectionMethod.Name == "get_Settings")
                    {
                        return new MongoCollectionSettings();
                    }

                    throw new NotSupportedException($"Unexpected IMongoCollection call: {collectionMethod.Name}");
                });
            }

            if (method.Name == "get_DatabaseNamespace")
            {
                return new DatabaseNamespace("fantaf1_porting_tests");
            }

            throw new NotSupportedException($"Unexpected IMongoDatabase call: {method.Name}");
        });

        return new MongoDatabaseHarness(database, [], () => null, () => null);
    }

    private static IMongoCollection<BsonDocument> CreateCollection(
        IMongoDatabase database,
        string collectionName,
        IReadOnlyList<BsonDocument> documents,
        Action<BsonDocument> captureReplace,
        Action<BsonDocument> captureUpdate)
    {
        return ProxyFactory<IMongoCollection<BsonDocument>>.Create((method, args) =>
        {
            if (method.Name == "get_CollectionNamespace")
            {
                return new CollectionNamespace(new DatabaseNamespace("fantaf1_porting_tests"), collectionName);
            }

            if (method.Name == "get_Database")
            {
                return database;
            }

            if (method.Name == "get_DocumentSerializer")
            {
                return BsonDocumentSerializer.Instance;
            }

            if (method.Name == "get_Settings")
            {
                return new MongoCollectionSettings();
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindSync))
            {
                return CreateCursor(method, args, documents);
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindAsync))
            {
                var cursor = CreateCursor(method, args, documents);
                return CreateCompletedTask(method.ReturnType, cursor);
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.ReplaceOneAsync))
            {
                captureReplace((BsonDocument)args![1]!);
                return CreateCompletedTask(
                    method.ReturnType,
                    new AcknowledgedReplaceOneResult());
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.InsertOneAsync))
            {
                captureReplace((BsonDocument)args![0]!);
                return Task.CompletedTask;
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.UpdateOneAsync))
            {
                var updateDefinition = (UpdateDefinition<BsonDocument>)args![1]!;
                captureUpdate(updateDefinition.Render(new RenderArgs<BsonDocument>(
                    BsonDocumentSerializer.Instance,
                    BsonSerializer.SerializerRegistry)).AsBsonDocument);

                return CreateCompletedTask(
                    method.ReturnType,
                    new TestUpdateResult());
            }

            throw new NotSupportedException($"Unexpected IMongoCollection call: {method.Name}");
        });
    }

    private static object CreateCursor(MethodInfo method, object?[]? args, IReadOnlyList<BsonDocument> documents)
    {
        var findOptions = args!
            .OfType<FindOptions<BsonDocument, BsonDocument>>()
            .SingleOrDefault();

        return new SingleBatchAsyncCursor<BsonDocument>(ApplyFindOptions(documents, findOptions));
    }

    private static IReadOnlyList<BsonDocument> ApplyFindOptions(
        IReadOnlyList<BsonDocument> documents,
        FindOptions<BsonDocument, BsonDocument>? findOptions)
    {
        IEnumerable<BsonDocument> query = documents;

        if (findOptions?.Sort is not null)
        {
            var renderedSort = findOptions.Sort.Render(new RenderArgs<BsonDocument>(
                BsonDocumentSerializer.Instance,
                BsonSerializer.SerializerRegistry));
            foreach (var sortElement in renderedSort.Elements.Reverse())
            {
                query = sortElement.Value.ToInt32() >= 0
                    ? query.OrderBy(document => NormalizeSortValue(document.GetValue(sortElement.Name, BsonNull.Value)))
                    : query.OrderByDescending(document => NormalizeSortValue(document.GetValue(sortElement.Name, BsonNull.Value)));
            }
        }

        if (findOptions?.Limit is int limit)
        {
            query = query.Take(limit);
        }

        return query.ToArray();
    }

    private static IComparable NormalizeSortValue(BsonValue value)
    {
        if (value.IsBsonNull)
        {
            return string.Empty;
        }

        if (value is BsonDateTime bsonDateTime)
        {
            return bsonDateTime.ToUniversalTime();
        }

        return value.IsString ? value.AsString : value.ToString() ?? string.Empty;
    }

    private static object CreateCompletedTask(Type taskType, object result)
    {
        var resultType = taskType.GetGenericArguments().Single();
        var fromResult = typeof(Task)
            .GetMethods(BindingFlags.Public | BindingFlags.Static)
            .Single(method => method.Name == nameof(Task.FromResult) && method.IsGenericMethodDefinition);

        return fromResult.MakeGenericMethod(resultType).Invoke(null, [result])!;
    }

    private sealed record MongoDatabaseHarness(
        IMongoDatabase Database,
        List<string> RequestedCollectionNames,
        Func<BsonDocument?> ReplacedDocumentAccessor,
        Func<BsonDocument?> RenderedUpdateAccessor)
    {
        public BsonDocument? ReplacedDocument => ReplacedDocumentAccessor();

        public BsonDocument? RenderedUpdate => RenderedUpdateAccessor();
    }

    private sealed class StaticClock : FantaF1.Application.Abstractions.System.IClock
    {
        public StaticClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class TestUpdateResult : UpdateResult
    {
        public override bool IsAcknowledged => true;

        public override bool IsModifiedCountAvailable => true;

        public override long MatchedCount => 1;

        public override long ModifiedCount => 1;

        public override BsonValue? UpsertedId => null;
    }

    private sealed class SingleBatchAsyncCursor<T> : IAsyncCursor<T>
    {
        private readonly IReadOnlyList<T> _batch;
        private int _state = -1;

        public SingleBatchAsyncCursor(IReadOnlyList<T> batch)
        {
            _batch = batch;
        }

        public IEnumerable<T> Current => _state == 0 ? _batch : [];

        public void Dispose()
        {
        }

        public bool MoveNext(CancellationToken cancellationToken = default)
        {
            if (_state >= 0)
            {
                _state = 1;
                return false;
            }

            _state = 0;
            return true;
        }

        public Task<bool> MoveNextAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(MoveNext(cancellationToken));
        }
    }

    private class ProxyFactory<T> : DispatchProxy
        where T : class
    {
        private Func<MethodInfo, object?[]?, object?>? _handler;

        public static T Create(Func<MethodInfo, object?[]?, object?> handler)
        {
            var proxy = DispatchProxy.Create<T, ProxyFactory<T>>();
            ((ProxyFactory<T>)(object)proxy)._handler = handler;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            ArgumentNullException.ThrowIfNull(targetMethod);
            return _handler!(targetMethod, args);
        }
    }

    private sealed class AcknowledgedReplaceOneResult : ReplaceOneResult
    {
        public override bool IsAcknowledged => true;

        public override bool IsModifiedCountAvailable => true;

        public override long MatchedCount => 1;

        public override long ModifiedCount => 1;

        public override BsonValue? UpsertedId => null;
    }
}
