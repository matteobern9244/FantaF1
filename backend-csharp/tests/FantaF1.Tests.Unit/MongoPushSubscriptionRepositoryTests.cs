using System.Reflection;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Mongo;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace FantaF1.Tests.Unit;

public sealed class MongoPushSubscriptionRepositoryTests
{
    [Fact]
    public async Task Push_subscription_repository_reads_a_document_by_id_and_maps_all_fields()
    {
        var harness = CreateDatabase(new BsonDocument
        {
            ["_id"] = "https://example.com/push",
            ["endpoint"] = "https://example.com/push",
            ["p256dh"] = "p256dh",
            ["auth"] = "auth",
            ["expirationTime"] = 123.45,
        });
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        var result = await repository.GetByIdAsync("https://example.com/push", CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("https://example.com/push", result!.Endpoint);
        Assert.Equal("p256dh", result.P256dh);
        Assert.Equal("auth", result.Auth);
        Assert.Equal(123.45, result.ExpirationTime);
        Assert.NotNull(harness.RenderedFindFilter);
        Assert.Equal("https://example.com/push", harness.RenderedFindFilter!["_id"].AsString);
    }

    [Fact]
    public async Task Push_subscription_repository_returns_null_when_the_document_does_not_exist()
    {
        var harness = CreateDatabase(null);
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        var result = await repository.GetByIdAsync("https://example.com/missing", CancellationToken.None);

        Assert.Null(result);
        Assert.NotNull(harness.RenderedFindFilter);
        Assert.Equal("https://example.com/missing", harness.RenderedFindFilter!["_id"].AsString);
    }

    [Fact]
    public async Task Push_subscription_repository_maps_bson_null_optional_fields_to_null_values()
    {
        var harness = CreateDatabase(new BsonDocument
        {
            ["_id"] = "https://example.com/push-nullables",
            ["endpoint"] = "https://example.com/push-nullables",
            ["p256dh"] = BsonNull.Value,
            ["auth"] = BsonNull.Value,
            ["expirationTime"] = BsonNull.Value,
        });
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        var result = await repository.GetByIdAsync("https://example.com/push-nullables", CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("https://example.com/push-nullables", result!.Endpoint);
        Assert.Null(result.P256dh);
        Assert.Null(result.Auth);
        Assert.Null(result.ExpirationTime);
    }

    [Fact]
    public async Task Push_subscription_repository_maps_null_optional_fields_when_the_document_contains_bson_null_values()
    {
        var harness = CreateDatabase(new BsonDocument
        {
            ["_id"] = "https://example.com/push-nullables",
            ["endpoint"] = "https://example.com/push-nullables",
            ["p256dh"] = BsonNull.Value,
            ["auth"] = BsonNull.Value,
            ["expirationTime"] = BsonNull.Value,
        });
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        var result = await repository.GetByIdAsync("https://example.com/push-nullables", CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("https://example.com/push-nullables", result!.Endpoint);
        Assert.Null(result.P256dh);
        Assert.Null(result.Auth);
        Assert.Null(result.ExpirationTime);
    }

    [Fact]
    public async Task Push_subscription_repository_upserts_the_document_by_endpoint()
    {
        var harness = CreateDatabase();
        var repository = new MongoPushSubscriptionRepository(harness.Database);
        var subscription = new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", 123.45);

        await repository.UpsertAsync(subscription, CancellationToken.None);

        Assert.NotNull(harness.RenderedReplaceFilter);
        Assert.Equal("https://example.com/push", harness.RenderedReplaceFilter!["_id"].AsString);
        Assert.NotNull(harness.RenderedReplacement);
        Assert.Equal("https://example.com/push", harness.RenderedReplacement!["endpoint"].AsString);
        Assert.Equal("p256dh", harness.RenderedReplacement["p256dh"].AsString);
        Assert.Equal("auth", harness.RenderedReplacement["auth"].AsString);
        Assert.Equal(123.45, harness.RenderedReplacement["expirationTime"].ToDouble());
        Assert.True(harness.ReplaceOptions!.IsUpsert);
    }

    [Fact]
    public async Task Push_subscription_repository_add_routes_through_the_same_upsert_mapping_with_null_optional_fields()
    {
        var harness = CreateDatabase();
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        await repository.AddAsync(new PushSubscriptionDocument("https://example.com/push", null, null, null), CancellationToken.None);

        Assert.NotNull(harness.RenderedReplacement);
        Assert.True(harness.RenderedReplacement!["p256dh"].IsBsonNull);
        Assert.True(harness.RenderedReplacement["auth"].IsBsonNull);
        Assert.True(harness.RenderedReplacement["expirationTime"].IsBsonNull);
    }

    [Fact]
    public async Task Push_subscription_repository_update_routes_through_the_same_upsert_mapping_with_null_optional_fields()
    {
        var harness = CreateDatabase();
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        await repository.UpdateAsync(new PushSubscriptionDocument("https://example.com/push", null, null, null), CancellationToken.None);

        Assert.NotNull(harness.RenderedReplacement);
        Assert.True(harness.RenderedReplacement!["p256dh"].IsBsonNull);
        Assert.True(harness.RenderedReplacement["auth"].IsBsonNull);
        Assert.True(harness.RenderedReplacement["expirationTime"].IsBsonNull);
    }

    [Fact]
    public async Task Push_subscription_repository_deletes_the_document_by_trimmed_endpoint()
    {
        var harness = CreateDatabase();
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        await repository.DeleteAsync("  https://example.com/push  ", CancellationToken.None);

        Assert.NotNull(harness.RenderedDeleteFilter);
        Assert.Equal("https://example.com/push", harness.RenderedDeleteFilter!["_id"].AsString);
    }

    [Fact]
    public async Task Push_subscription_repository_rejects_blank_delete_endpoints()
    {
        var harness = CreateDatabase();
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        await Assert.ThrowsAsync<ArgumentException>(() => repository.DeleteAsync("   ", CancellationToken.None));
    }

    [Fact]
    public async Task Push_subscription_repository_rejects_null_subscriptions_during_upsert()
    {
        var harness = CreateDatabase();
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        await Assert.ThrowsAsync<ArgumentNullException>(() => repository.UpsertAsync(null!, CancellationToken.None));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Push_subscription_repository_rejects_blank_subscription_endpoints_during_upsert(string endpoint)
    {
        var harness = CreateDatabase();
        var repository = new MongoPushSubscriptionRepository(harness.Database);

        await Assert.ThrowsAsync<ArgumentException>(() => repository.UpsertAsync(
            new PushSubscriptionDocument(endpoint, "p256dh", "auth", 123.45),
            CancellationToken.None));
    }

    private static MongoDatabaseHarness CreateDatabase(BsonDocument? findResult = null)
    {
        BsonDocument? renderedFindFilter = null;
        BsonDocument? renderedReplaceFilter = null;
        BsonDocument? renderedReplacement = null;
        BsonDocument? renderedDeleteFilter = null;
        ReplaceOptions? replaceOptions = null;
        IMongoDatabase? database = null;
        database = ProxyFactory<IMongoDatabase>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoDatabase.GetCollection))
            {
                return CreateCollection(
                    filter => renderedFindFilter = filter,
                    findResult,
                    filter => renderedReplaceFilter = filter,
                    replacement => renderedReplacement = replacement,
                    filter => renderedDeleteFilter = filter,
                    options => replaceOptions = options);
            }

            return null!;
        });

        return new MongoDatabaseHarness(
            database,
            () => renderedFindFilter,
            () => renderedReplaceFilter,
            () => renderedReplacement,
            () => renderedDeleteFilter,
            () => replaceOptions);
    }

    private static IMongoCollection<BsonDocument> CreateCollection(
        Action<BsonDocument> captureFindFilter,
        BsonDocument? findResult,
        Action<BsonDocument> captureReplaceFilter,
        Action<BsonDocument> captureReplacement,
        Action<BsonDocument> captureDeleteFilter,
        Action<ReplaceOptions> captureReplaceOptions)
    {
        return ProxyFactory<IMongoCollection<BsonDocument>>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindAsync))
            {
                var filter = (FilterDefinition<BsonDocument>)args![0]!;
                captureFindFilter(filter.Render(new RenderArgs<BsonDocument>(BsonDocumentSerializer.Instance, BsonSerializer.SerializerRegistry)));
                var documents = findResult is null ? [] : new[] { findResult };
                return Task.FromResult<IAsyncCursor<BsonDocument>>(new SingleBatchAsyncCursor<BsonDocument>(documents));
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.ReplaceOneAsync))
            {
                var filter = (FilterDefinition<BsonDocument>)args![0]!;
                var replacement = (BsonDocument)args[1]!;
                var options = (ReplaceOptions)args[2]!;
                captureReplaceFilter(filter.Render(new RenderArgs<BsonDocument>(BsonDocumentSerializer.Instance, BsonSerializer.SerializerRegistry)));
                captureReplacement(replacement);
                captureReplaceOptions(options);
                return Task.FromResult<ReplaceOneResult>(new AcknowledgedReplaceOneResult());
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.DeleteOneAsync))
            {
                var filter = (FilterDefinition<BsonDocument>)args![0]!;
                captureDeleteFilter(filter.Render(new RenderArgs<BsonDocument>(BsonDocumentSerializer.Instance, BsonSerializer.SerializerRegistry)));
                return Task.FromResult<DeleteResult>(new AcknowledgedDeleteResult(1));
            }

            if (method.Name == "get_DocumentSerializer")
            {
                return BsonDocumentSerializer.Instance;
            }

            if (method.Name == "get_Settings")
            {
                return new MongoCollectionSettings();
            }

            return null!;
        });
    }

    private sealed record MongoDatabaseHarness(
        IMongoDatabase Database,
        Func<BsonDocument?> RenderedFindFilterAccessor,
        Func<BsonDocument?> RenderedReplaceFilterAccessor,
        Func<BsonDocument?> RenderedReplacementAccessor,
        Func<BsonDocument?> RenderedDeleteFilterAccessor,
        Func<ReplaceOptions?> ReplaceOptionsAccessor)
    {
        public BsonDocument? RenderedFindFilter => RenderedFindFilterAccessor();
        public BsonDocument? RenderedReplaceFilter => RenderedReplaceFilterAccessor();
        public BsonDocument? RenderedReplacement => RenderedReplacementAccessor();
        public BsonDocument? RenderedDeleteFilter => RenderedDeleteFilterAccessor();
        public ReplaceOptions? ReplaceOptions => ReplaceOptionsAccessor();
    }

    private sealed class AcknowledgedDeleteResult : DeleteResult
    {
        public AcknowledgedDeleteResult(long deletedCount) => DeletedCount = deletedCount;
        public override bool IsAcknowledged => true;
        public override long DeletedCount { get; }
    }

    private sealed class AcknowledgedReplaceOneResult : ReplaceOneResult
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

        public SingleBatchAsyncCursor(IReadOnlyList<T> batch) => _batch = batch;

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
