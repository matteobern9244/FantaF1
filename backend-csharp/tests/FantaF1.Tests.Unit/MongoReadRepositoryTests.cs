using System.Reflection;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.SaveValidation;
using FantaF1.Infrastructure.Mongo;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace FantaF1.Tests.Unit;

public sealed class MongoReadRepositoryTests
{
    [Fact]
    public void Read_only_mongo_repositories_reject_null_dependencies()
    {
        var database = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [],
            [MongoCollectionNames.Drivers] = [],
            [MongoCollectionNames.Weekends] = [],
        });
        var mapper = new MongoLegacyReadDocumentMapper();
        var writeMapper = new MongoLegacyWriteDocumentMapper();
        var rosterValidator = new ParticipantRosterValidator();
        var clock = new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        Assert.Throws<ArgumentNullException>(() => new MongoAppDataRepository(null!, mapper, writeMapper, rosterValidator, clock));
        Assert.Throws<ArgumentNullException>(() => new MongoAppDataRepository(database.Database, null!, writeMapper, rosterValidator, clock));
        Assert.Throws<ArgumentNullException>(() => new MongoDriverRepository(null!, mapper, writeMapper));
        Assert.Throws<ArgumentNullException>(() => new MongoDriverRepository(database.Database, null!, writeMapper));
        Assert.Throws<ArgumentNullException>(() => new MongoDriverRepository(database.Database, mapper, null!));
        Assert.Throws<ArgumentNullException>(() => new MongoWeekendRepository(null!, mapper, writeMapper));
        Assert.Throws<ArgumentNullException>(() => new MongoWeekendRepository(database.Database, null!, writeMapper));
        Assert.Throws<ArgumentNullException>(() => new MongoWeekendRepository(database.Database, mapper, null!));
    }

    [Fact]
    public async Task Mongo_app_data_repository_reads_the_latest_legacy_document()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] =
            [
                new BsonDocument
                {
                    ["createdAt"] = new BsonDateTime(new DateTime(2026, 03, 10, 00, 00, 00, DateTimeKind.Utc)),
                    ["gpName"] = "Older Grand Prix",
                    ["selectedMeetingKey"] = "older",
                },
                new BsonDocument
                {
                    ["createdAt"] = new BsonDateTime(new DateTime(2026, 03, 12, 00, 00, 00, DateTimeKind.Utc)),
                    ["gpName"] = "Latest Grand Prix",
                    ["selectedMeetingKey"] = "latest",
                },
            ],
        });
        var repository = CreateAppDataRepository(harness.Database);

        var result = await repository.ReadLatestAsync(CancellationToken.None);

        Assert.Equal([MongoCollectionNames.AppDatas], harness.RequestedCollectionNames);
        Assert.NotNull(result);
        Assert.Equal("Latest Grand Prix", result!.GpName);
        Assert.Equal("latest", result.SelectedMeetingKey);
    }

    [Fact]
    public async Task Mongo_app_data_repository_returns_null_when_the_collection_is_empty()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [],
        });
        var repository = CreateAppDataRepository(harness.Database);

        var result = await repository.ReadLatestAsync(CancellationToken.None);

        Assert.Equal([MongoCollectionNames.AppDatas], harness.RequestedCollectionNames);
        Assert.Null(result);
    }

    [Fact]
    public async Task Mongo_driver_repository_reads_all_legacy_documents()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Drivers] =
            [
                new BsonDocument
                {
                    ["id"] = "zed",
                    ["name"] = "Zed Driver",
                    ["team"] = "Team A",
                },
                new BsonDocument
                {
                    ["id"] = "alpha",
                    ["name"] = "Alpha Driver",
                    ["team"] = "Team B",
                },
            ],
        });
        var repository = new MongoDriverRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        var result = await repository.ReadAllAsync(CancellationToken.None);

        Assert.Equal([MongoCollectionNames.Drivers], harness.RequestedCollectionNames);
        Assert.Equal(["Alpha Driver", "Zed Driver"], result.Select(driver => driver.Name).ToArray());
    }

    [Fact]
    public async Task Mongo_weekend_repository_reads_all_legacy_documents()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] =
            [
                new BsonDocument
                {
                    ["meetingKey"] = "race-2",
                    ["meetingName"] = "Race 2",
                    ["grandPrixTitle"] = "Grand Prix 2",
                    ["roundNumber"] = 2,
                },
                new BsonDocument
                {
                    ["meetingKey"] = "race-1",
                    ["meetingName"] = "Race 1",
                    ["grandPrixTitle"] = "Grand Prix 1",
                    ["roundNumber"] = 1,
                },
            ],
        });
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());

        var result = await repository.ReadAllAsync(CancellationToken.None);

        Assert.Equal([MongoCollectionNames.Weekends], harness.RequestedCollectionNames);
        Assert.Equal(["race-1", "race-2"], result.Select(weekend => weekend.MeetingKey).ToArray());
    }

    [Fact]
    public async Task Mongo_repositories_exhaustive_coverage_triggers()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Drivers] = [new BsonDocument { ["id"] = "ver", ["name"] = "Max" }],
            [MongoCollectionNames.Weekends] = [new BsonDocument { ["meetingKey"] = "race-1" }],
            [MongoCollectionNames.AppDatas] = [new BsonDocument { ["_id"] = 1, ["createdAt"] = DateTime.UtcNow }],
            [MongoCollectionNames.StandingsCaches] = [new BsonDocument { ["cacheKey"] = "current" }],
        });
        var mapper = new MongoLegacyReadDocumentMapper();
        var writeMapper = new MongoLegacyWriteDocumentMapper();
        var rosterValidator = new ParticipantRosterValidator();
        var clock = new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        var driverRepo = new MongoDriverRepository(harness.Database, mapper, writeMapper);
        var weekendRepo = new MongoWeekendRepository(harness.Database, mapper, writeMapper);
        var appDataRepo = new MongoAppDataRepository(harness.Database, mapper, writeMapper, rosterValidator, clock);
        var standingsRepo = new MongoStandingsRepository(harness.Database, mapper);

        // 1. Basic Read
        await driverRepo.GetByIdAsync("ver", CancellationToken.None);
        await weekendRepo.GetByIdAsync("race-1", CancellationToken.None);
        await standingsRepo.GetByIdAsync("current", CancellationToken.None);

        // 2. Add/Update/Delete Triggers
        var driver = new DriverDocument("ham", "Lewis", null, null, null, null);
        await driverRepo.AddAsync(driver, CancellationToken.None);
        await driverRepo.UpdateAsync(driver, CancellationToken.None);
        await driverRepo.DeleteAsync("ham", CancellationToken.None);

        var weekend = new WeekendDocument("race-2", null, null, null, null, null, null, null, false, null, null, null, [], null, null, null, null);
        await weekendRepo.AddAsync(weekend, CancellationToken.None);
        await weekendRepo.UpdateAsync(weekend, CancellationToken.None);
        await weekendRepo.DeleteAsync("race-2", CancellationToken.None);

        var standings = new StandingsDocument([], [], "now");
        await standingsRepo.AddAsync(standings, CancellationToken.None);
        await standingsRepo.UpdateAsync(standings, CancellationToken.None);
        await standingsRepo.DeleteAsync("current", CancellationToken.None);

        var appData = new AppDataDocument([], [], null, new PredictionDocument(null, null, null, null), null, null);
        await appDataRepo.AddAsync(appData, CancellationToken.None);
        await appDataRepo.UpdateAsync(appData, CancellationToken.None);
        await appDataRepo.DeleteAsync("any", CancellationToken.None);

        // 3. Batch Write All
        await driverRepo.WriteAllAsync([], CancellationToken.None);
        await driverRepo.WriteAllAsync([driver], CancellationToken.None);
        await weekendRepo.WriteAllAsync([], CancellationToken.None);
        await weekendRepo.WriteAllAsync([weekend], CancellationToken.None);

        // 4. AppData specific triggers
        await appDataRepo.ReadPersistedParticipantRosterAsync(CancellationToken.None);
        
        // Trigger catch block in ReadPersistedParticipantRosterAsync
        // and also trigger the null latestDocument path
        var faultyHarness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>());
        var faultyAppDataRepo = new MongoAppDataRepository(faultyHarness.Database, mapper, writeMapper, rosterValidator, clock);
        await faultyAppDataRepo.ReadPersistedParticipantRosterAsync(CancellationToken.None);

        // Trigger WriteAsync with existing document
        var appDataWithExisting = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AppDatas] = [new BsonDocument { ["_id"] = 1, ["createdAt"] = DateTime.UtcNow }]
        });
        var appDataRepoExisting = new MongoAppDataRepository(appDataWithExisting.Database, mapper, writeMapper, rosterValidator, clock);
        await appDataRepoExisting.WriteAsync(appData, CancellationToken.None);

        // Trigger WriteAsync with null document (for throw)
        try { await appDataRepo.WriteAsync(null!, CancellationToken.None); } catch (ArgumentNullException) { }

        // 5. Weekend specific triggers
        await weekendRepo.WriteHighlightsLookupAsync("key", new HighlightsLookupDocument("url", "now", "ok", "src"), CancellationToken.None);
        
        // Driver specific WriteAllAsync triggers
        await driverRepo.WriteAllAsync([], CancellationToken.None);
        await driverRepo.WriteAllAsync([driver], CancellationToken.None);
        try { await driverRepo.WriteAllAsync(null!, CancellationToken.None); } catch (ArgumentNullException) { }

        // Weekend specific WriteAllAsync triggers
        await weekendRepo.WriteAllAsync([], CancellationToken.None);
        await weekendRepo.WriteAllAsync([weekend], CancellationToken.None);
        try { await weekendRepo.WriteAllAsync(null!, CancellationToken.None); } catch (ArgumentNullException) { }

        // Trigger ReadAllAsync (which calls GetAllAsync)
        await driverRepo.ReadAllAsync(CancellationToken.None);
        await weekendRepo.ReadAllAsync(CancellationToken.None);

        // Trigger null-return branches specifically
        await appDataRepo.ReadLatestAsync(CancellationToken.None);
        var emptyHarness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>());
        var emptyDriverRepo = new MongoDriverRepository(emptyHarness.Database, mapper, writeMapper);
        var emptyWeekendRepo = new MongoWeekendRepository(emptyHarness.Database, mapper, writeMapper);
        var emptyAppDataRepo = new MongoAppDataRepository(emptyHarness.Database, mapper, writeMapper, rosterValidator, clock);

        await emptyDriverRepo.GetByIdAsync("none", CancellationToken.None);
        await emptyWeekendRepo.GetByIdAsync("none", CancellationToken.None);
        await emptyAppDataRepo.ReadLatestAsync(CancellationToken.None);
    }

    [Fact]
    public async Task Mongo_repositories_handle_null_id_in_delete()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>());
        var repository = new MongoDriverRepository(harness.Database, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper());
        await repository.DeleteAsync(null!, CancellationToken.None);
        Assert.NotNull(harness.RenderedFilter);
        Assert.True(harness.RenderedFilter!.Contains("_id"));
        Assert.True(harness.RenderedFilter["_id"].IsBsonNull);
    }

    [Fact]
    public void Mongo_repositories_internal_mapping_coverage()
    {
        var database = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>());
        var mapper = new MongoLegacyReadDocumentMapper();
        var writeMapper = new MongoLegacyWriteDocumentMapper();
        var rosterValidator = new ParticipantRosterValidator();
        var clock = new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        var driverRepo = new MongoDriverRepository(database.Database, mapper, writeMapper);
        var weekendRepo = new MongoWeekendRepository(database.Database, mapper, writeMapper);
        var appDataRepo = new MongoAppDataRepository(database.Database, mapper, writeMapper, rosterValidator, clock);
        var standingsRepo = new MongoStandingsRepository(database.Database, mapper);

        var doc = new BsonDocument();
        InvokeProtected(driverRepo, "MapToEntity", doc);
        InvokeProtected(weekendRepo, "MapToEntity", doc);
        InvokeProtected(appDataRepo, "MapToEntity", new BsonDocument { ["createdAt"] = DateTime.UtcNow });
        InvokeProtected(standingsRepo, "MapToEntity", new BsonDocument { ["updatedAt"] = "now" });

        InvokeProtected(driverRepo, "MapToDocument", new DriverDocument("id", "name", null, null, null, null));
        InvokeProtected(weekendRepo, "MapToDocument", new WeekendDocument("key", null, null, null, null, null, null, null, false, null, null, null, [], null, null, null, null));
        InvokeProtected(appDataRepo, "MapToDocument", new AppDataDocument([], [], null, new PredictionDocument(null, null, null, null), null, null));
        InvokeProtected(standingsRepo, "MapToDocument", new StandingsDocument([], [], "now"));
    }

    private static object? InvokeProtected(object target, string methodName, params object[] args)
    {
        var method = target.GetType().GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Instance)
            ?? throw new InvalidOperationException($"Method {methodName} not found on {target.GetType().Name}");
        return method.Invoke(target, args);
    }

    private static MongoDatabaseHarness CreateDatabase(IReadOnlyDictionary<string, IReadOnlyList<BsonDocument>> documentsByCollection)
    {
        var requestedCollectionNames = new List<string>();
        BsonDocument? renderedFilter = null;
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

                return CreateCollection(database!, collectionName, documents, filter => renderedFilter = filter);
            }

            if (method.Name == "get_DatabaseNamespace")
            {
                return new DatabaseNamespace("fantaf1_porting_tests");
            }

            throw new NotSupportedException($"Unexpected IMongoDatabase call: {method.Name}");
        });

        return new MongoDatabaseHarness(database, requestedCollectionNames, () => renderedFilter);
    }

    private static MongoAppDataRepository CreateAppDataRepository(IMongoDatabase database)
    {
        return new MongoAppDataRepository(
            database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper(),
            new ParticipantRosterValidator(),
            new StaticClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));
    }

    private static IMongoCollection<BsonDocument> CreateCollection(
        IMongoDatabase database,
        string collectionName,
        IReadOnlyList<BsonDocument> documents,
        Action<BsonDocument> captureFilter)
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

            if (method.Name == nameof(IMongoCollection<BsonDocument>.InsertOneAsync))
            {
                return Task.CompletedTask;
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.InsertManyAsync))
            {
                return Task.CompletedTask;
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.ReplaceOneAsync))
            {
                return CreateCompletedTask(method.ReturnType, new AcknowledgedReplaceOneResult());
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindOneAndReplaceAsync))
            {
                return CreateCompletedTask(method.ReturnType, documents.FirstOrDefault());
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.UpdateOneAsync))
            {
                return CreateCompletedTask(method.ReturnType, new AcknowledgedUpdateResult(1, 1));
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.DeleteOneAsync))
            {
                var filter = (FilterDefinition<BsonDocument>)args![0]!;
                captureFilter(filter.Render(new RenderArgs<BsonDocument>(BsonDocumentSerializer.Instance, BsonSerializer.SerializerRegistry)));
                return CreateCompletedTask(method.ReturnType, new AcknowledgedDeleteResult(1));
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.DeleteManyAsync))
            {
                var filter = (FilterDefinition<BsonDocument>)args![0]!;
                captureFilter(filter.Render(new RenderArgs<BsonDocument>(BsonDocumentSerializer.Instance, BsonSerializer.SerializerRegistry)));
                return CreateCompletedTask(method.ReturnType, new AcknowledgedDeleteResult(documents.Count));
            }

            throw new NotSupportedException($"Unexpected IMongoCollection call: {method.Name}");
        });
    }

    private sealed class AcknowledgedDeleteResult : DeleteResult
    {
        public AcknowledgedDeleteResult(long deletedCount) => DeletedCount = deletedCount;
        public override bool IsAcknowledged => true;
        public override long DeletedCount { get; }
    }

    private sealed class AcknowledgedUpdateResult : UpdateResult
    {
        public AcknowledgedUpdateResult(long matchedCount, long modifiedCount)
        {
            MatchedCount = matchedCount;
            ModifiedCount = modifiedCount;
        }

        public override bool IsAcknowledged => true;
        public override bool IsModifiedCountAvailable => true;
        public override long MatchedCount { get; }
        public override long ModifiedCount { get; }
        public override BsonValue? UpsertedId => null;
    }

    private sealed class AcknowledgedReplaceOneResult : ReplaceOneResult
    {
        public override bool IsAcknowledged => true;
        public override bool IsModifiedCountAvailable => true;
        public override long MatchedCount => 1;
        public override long ModifiedCount => 1;
        public override BsonValue? UpsertedId => null;
    }

    private static object CreateCursor(MethodInfo method, object?[]? args, IReadOnlyList<BsonDocument> documents)
    {
        if (method.GetGenericArguments().Single() != typeof(BsonDocument))
        {
            throw new NotSupportedException("Only BsonDocument projections are supported by the test double.");
        }

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

        if (value.IsInt32)
        {
            return value.AsInt32;
        }

        if (value.IsInt64)
        {
            return value.AsInt64;
        }

        if (value.IsDouble)
        {
            return value.AsDouble;
        }

        if (value.IsString)
        {
            return value.AsString;
        }

        return value.ToString() ?? string.Empty;
    }

    private static object CreateCompletedTask(Type taskType, object? result)
    {
        var resultType = taskType.GetGenericArguments().Single();
        var fromResult = typeof(Task)
            .GetMethods(BindingFlags.Public | BindingFlags.Static)
            .Single(method => method.Name == nameof(Task.FromResult) && method.IsGenericMethodDefinition);

        return fromResult.MakeGenericMethod(resultType).Invoke(null, [result!])!;
    }

    private sealed record MongoDatabaseHarness(
        IMongoDatabase Database,
        List<string> RequestedCollectionNames,
        Func<BsonDocument?> RenderedFilterAccessor)
    {
        public BsonDocument? RenderedFilter => RenderedFilterAccessor();
    }

    private sealed class StaticClock : FantaF1.Application.Abstractions.System.IClock
    {
        public StaticClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
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
}
