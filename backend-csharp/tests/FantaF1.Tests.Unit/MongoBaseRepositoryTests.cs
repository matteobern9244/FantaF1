using System.Reflection;
using FantaF1.Domain.Common;
using FantaF1.Infrastructure.Mongo;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace FantaF1.Tests.Unit;

public sealed class MongoBaseRepositoryTests
{
    [Fact]
    public async Task Mongo_repository_get_all_reads_all_documents_from_collection()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            ["test_entities"] =
            [
                new BsonDocument { ["_id"] = "1", ["name"] = "Entity 1" },
                new BsonDocument { ["_id"] = "2", ["name"] = "Entity 2" },
            ],
        });
        var repository = new TestMongoRepository(harness.Database);

        var result = await repository.GetAllAsync(CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.Equal("Entity 1", result[0].Name);
        Assert.Equal("Entity 2", result[1].Name);
    }

    [Fact]
    public async Task Mongo_repository_delete_removes_the_document_by_id()
    {
        var harness = CreateDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            ["test_entities"] = [],
        });
        var repository = new TestMongoRepository(harness.Database);

        await repository.DeleteAsync("target-id", CancellationToken.None);

        Assert.NotNull(harness.RenderedFilter);
        Assert.Equal("target-id", harness.RenderedFilter!["_id"].AsString);
    }

    private sealed record TestEntity(string Id, string Name) : IEntity<string>;

    private sealed class TestMongoRepository : MongoRepository<TestEntity, string>
    {
        public TestMongoRepository(IMongoDatabase database)
            : base(database, "test_entities")
        {
        }

        public override Task<TestEntity?> GetByIdAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public override Task AddAsync(TestEntity entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public override Task UpdateAsync(TestEntity entity, CancellationToken cancellationToken) => throw new NotImplementedException();

        protected override TestEntity MapToEntity(BsonDocument document) => new(document["_id"].AsString, document["name"].AsString);
        protected override BsonDocument MapToDocument(TestEntity entity) => new() { ["_id"] = entity.Id, ["name"] = entity.Name };
    }

    private static MongoDatabaseHarness CreateDatabase(IReadOnlyDictionary<string, IReadOnlyList<BsonDocument>> documentsByCollection)
    {
        BsonDocument? renderedFilter = null;
        IMongoDatabase? database = null;
        database = ProxyFactory<IMongoDatabase>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoDatabase.GetCollection))
            {
                var collectionName = (string)args![0]!;
                var documents = documentsByCollection.TryGetValue(collectionName, out var value) ? value : [];
                return CreateCollection(database!, collectionName, documents, filter => renderedFilter = filter);
            }
            return null!;
        });

        return new MongoDatabaseHarness(database, () => renderedFilter);
    }

    private static IMongoCollection<BsonDocument> CreateCollection(
        IMongoDatabase database,
        string collectionName,
        IReadOnlyList<BsonDocument> documents,
        Action<BsonDocument> captureFilter)
    {
        return ProxyFactory<IMongoCollection<BsonDocument>>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindAsync))
            {
                return Task.FromResult<IAsyncCursor<BsonDocument>>(new SingleBatchAsyncCursor<BsonDocument>(documents));
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.DeleteOneAsync))
            {
                var filter = (FilterDefinition<BsonDocument>)args![0]!;
                captureFilter(filter.Render(new RenderArgs<BsonDocument>(BsonDocumentSerializer.Instance, BsonSerializer.SerializerRegistry)));
                return Task.FromResult<DeleteResult>(new AcknowledgedDeleteResult(1));
            }

            if (method.Name == "get_DocumentSerializer") return BsonDocumentSerializer.Instance;
            if (method.Name == "get_Settings") return new MongoCollectionSettings();

            return null!;
        });
    }

    private sealed record MongoDatabaseHarness(IMongoDatabase Database, Func<BsonDocument?> RenderedFilterAccessor)
    {
        public BsonDocument? RenderedFilter => RenderedFilterAccessor();
    }

    private sealed class AcknowledgedDeleteResult : DeleteResult
    {
        public AcknowledgedDeleteResult(long deletedCount) => DeletedCount = deletedCount;
        public override bool IsAcknowledged => true;
        public override long DeletedCount { get; }
    }

    private sealed class SingleBatchAsyncCursor<T> : IAsyncCursor<T>
    {
        private readonly IReadOnlyList<T> _batch;
        private int _state = -1;
        public SingleBatchAsyncCursor(IReadOnlyList<T> batch) => _batch = batch;
        public IEnumerable<T> Current => _state == 0 ? _batch : [];
        public void Dispose() { }
        public bool MoveNext(CancellationToken cancellationToken = default)
        {
            if (_state >= 0) { _state = 1; return false; }
            _state = 0; return true;
        }
        public Task<bool> MoveNextAsync(CancellationToken cancellationToken = default) => Task.FromResult(MoveNext(cancellationToken));
    }

    private class ProxyFactory<T> : DispatchProxy where T : class
    {
        private Func<MethodInfo, object?[]?, object?>? _handler;
        public static T Create(Func<MethodInfo, object?[]?, object?> handler)
        {
            var proxy = DispatchProxy.Create<T, ProxyFactory<T>>();
            ((ProxyFactory<T>)(object)proxy)._handler = handler;
            return proxy;
        }
        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) => _handler!(targetMethod!, args);
    }
}
