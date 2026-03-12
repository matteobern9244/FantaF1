using System.Reflection;
using FantaF1.Domain.ReadModels;
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

        Assert.Throws<ArgumentNullException>(() => new MongoAppDataRepository(null!, mapper));
        Assert.Throws<ArgumentNullException>(() => new MongoAppDataRepository(database.Database, null!));
        Assert.Throws<ArgumentNullException>(() => new MongoDriverRepository(null!, mapper));
        Assert.Throws<ArgumentNullException>(() => new MongoDriverRepository(database.Database, null!));
        Assert.Throws<ArgumentNullException>(() => new MongoWeekendRepository(null!, mapper));
        Assert.Throws<ArgumentNullException>(() => new MongoWeekendRepository(database.Database, null!));
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
        var repository = new MongoAppDataRepository(harness.Database, new MongoLegacyReadDocumentMapper());

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
        var repository = new MongoAppDataRepository(harness.Database, new MongoLegacyReadDocumentMapper());

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
        var repository = new MongoDriverRepository(harness.Database, new MongoLegacyReadDocumentMapper());

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
        var repository = new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper());

        var result = await repository.ReadAllAsync(CancellationToken.None);

        Assert.Equal([MongoCollectionNames.Weekends], harness.RequestedCollectionNames);
        Assert.Equal(["race-1", "race-2"], result.Select(weekend => weekend.MeetingKey).ToArray());
    }

    private static MongoDatabaseHarness CreateDatabase(IReadOnlyDictionary<string, IReadOnlyList<BsonDocument>> documentsByCollection)
    {
        var requestedCollectionNames = new List<string>();
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

                return CreateCollection(database!, collectionName, documents);
            }

            if (method.Name == "get_DatabaseNamespace")
            {
                return new DatabaseNamespace("fantaf1_porting_tests");
            }

            throw new NotSupportedException($"Unexpected IMongoDatabase call: {method.Name}");
        });

        return new MongoDatabaseHarness(database, requestedCollectionNames);
    }

    private static IMongoCollection<BsonDocument> CreateCollection(
        IMongoDatabase database,
        string collectionName,
        IReadOnlyList<BsonDocument> documents)
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

            throw new NotSupportedException($"Unexpected IMongoCollection call: {method.Name}");
        });
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

        return value.ToString();
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
        List<string> RequestedCollectionNames);

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
