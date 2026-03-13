using System.Net;
using System.Reflection;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Mongo;
using FantaF1.Infrastructure.Standings;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace FantaF1.Tests.Unit;

public sealed class StandingsInfrastructureTests
{
    [Fact]
    public void Standings_source_client_and_repository_reject_null_dependencies()
    {
        var handler = new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("<html></html>"),
        });
        var httpClient = new HttpClient(handler);
        var clock = new StubClock(new DateTimeOffset(2026, 03, 13, 09, 00, 00, TimeSpan.Zero));
        var database = CreateDatabase(new BsonDocument());
        var mapper = new MongoLegacyReadDocumentMapper();

        Assert.Throws<ArgumentNullException>(() => new StandingsSourceClient(null!, clock));
        Assert.Throws<ArgumentNullException>(() => new StandingsSourceClient(httpClient, null!));
        Assert.Throws<ArgumentNullException>(() => new MongoStandingsRepository(null!, mapper));
        Assert.Throws<ArgumentNullException>(() => new MongoStandingsRepository(database.Database, null!));
    }

    [Fact]
    public async Task Standings_source_client_uses_the_authoritative_urls_and_browser_headers()
    {
        var requests = new List<HttpRequestMessage>();
        var handler = new RecordingHttpMessageHandler(request =>
        {
            requests.Add(CloneRequest(request));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("<table></table>"),
            };
        });
        using var httpClient = new HttpClient(handler);
        var client = new StandingsSourceClient(
            httpClient,
            new StubClock(new DateTimeOffset(2026, 03, 13, 09, 00, 00, TimeSpan.Zero)));

        var driverHtml = await client.FetchDriverStandingsHtmlAsync(CancellationToken.None);
        var constructorHtml = await client.FetchConstructorStandingsHtmlAsync(CancellationToken.None);

        Assert.Equal("<table></table>", driverHtml);
        Assert.Equal("<table></table>", constructorHtml);
        Assert.Equal(
            [
                "https://www.formula1.com/en/results.html/2026/drivers.html",
                "https://www.formula1.com/en/results.html/2026/team.html",
            ],
            requests.Select(request => request.RequestUri?.ToString()).ToArray());
        Assert.All(requests, request =>
        {
            Assert.True(request.Headers.TryGetValues("user-agent", out var userAgentValues));
            Assert.True(request.Headers.TryGetValues("accept-language", out var acceptLanguageValues));
            Assert.Contains("Mozilla/5.0", userAgentValues!);
            Assert.Contains("it-IT", acceptLanguageValues!);
            Assert.Contains(acceptLanguageValues!, value => value.StartsWith("it;", StringComparison.Ordinal));
            Assert.Contains(acceptLanguageValues!, value => value.StartsWith("en;", StringComparison.Ordinal));
        });
    }

    [Fact]
    public async Task Standings_source_client_throws_the_node_compatible_status_message_on_http_failures()
    {
        using var httpClient = new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.BadGateway)));
        var client = new StandingsSourceClient(
            httpClient,
            new StubClock(new DateTimeOffset(2026, 03, 13, 09, 00, 00, TimeSpan.Zero)));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => client.FetchConstructorStandingsHtmlAsync(CancellationToken.None));

        Assert.Equal("502", exception.Message);
    }

    [Fact]
    public async Task Mongo_standings_repository_reads_the_current_cache_and_writes_the_node_compatible_shape()
    {
        var existingDocument = new BsonDocument
        {
            ["cacheKey"] = "current",
            ["driverStandings"] = new BsonArray
            {
                new BsonDocument
                {
                    ["position"] = 1,
                    ["driverId"] = "pia",
                    ["name"] = "Oscar Piastri",
                    ["team"] = "McLaren",
                    ["points"] = 99,
                    ["avatarUrl"] = "https://media.example.com/pia.webp",
                    ["color"] = "#FF8700",
                },
            },
            ["constructorStandings"] = new BsonArray
            {
                new BsonDocument
                {
                    ["position"] = 1,
                    ["team"] = "McLaren",
                    ["points"] = 188,
                    ["color"] = "#FF8700",
                    ["logoUrl"] = "https://media.example.com/mclaren.webp",
                },
            },
            ["updatedAt"] = "2026-03-13T10:00:00.000Z",
        };
        var harness = CreateDatabase(existingDocument);
        var repository = new MongoStandingsRepository(harness.Database, new MongoLegacyReadDocumentMapper());

        var current = await repository.ReadCurrentAsync(CancellationToken.None);

        Assert.Equal([MongoCollectionNames.StandingsCaches], harness.RequestedCollectionNames);
        Assert.Equal("2026-03-13T10:00:00.000Z", current.UpdatedAt);
        Assert.Single(current.DriverStandings);
        Assert.Single(current.ConstructorStandings);

        await repository.WriteCurrentAsync(
            new StandingsDocument(
            [
                new DriverStandingDocument(1, "nor", "Lando Norris", "McLaren", 89, "https://media.example.com/nor.webp", "#FF8700"),
            ],
            [
                new ConstructorStandingDocument(1, "McLaren", 188, "#FF8700", "https://media.example.com/mclaren.webp"),
            ],
            "2026-03-13T11:00:00.000Z"),
            CancellationToken.None);

        Assert.NotNull(harness.StoredDocument);
        Assert.Equal("current", harness.StoredDocument!["cacheKey"].AsString);
        Assert.Equal("2026-03-13T11:00:00.000Z", harness.StoredDocument["updatedAt"].AsString);
        Assert.Equal("Lando Norris", harness.StoredDocument["driverStandings"].AsBsonArray[0]["name"].AsString);
        Assert.Equal("https://media.example.com/mclaren.webp", harness.StoredDocument["constructorStandings"].AsBsonArray[0]["logoUrl"].AsString);
    }

    [Fact]
    public async Task Mongo_standings_repository_returns_an_empty_payload_when_the_cache_document_is_missing()
    {
        var harness = CreateDatabase(null);
        var repository = new MongoStandingsRepository(harness.Database, new MongoLegacyReadDocumentMapper());

        var result = await repository.ReadCurrentAsync(CancellationToken.None);

        Assert.Equal([MongoCollectionNames.StandingsCaches], harness.RequestedCollectionNames);
        Assert.Empty(result.DriverStandings);
        Assert.Empty(result.ConstructorStandings);
        Assert.Equal(string.Empty, result.UpdatedAt);
    }

    [Fact]
    public async Task Mongo_standings_repository_rejects_null_documents_on_write()
    {
        var repository = new MongoStandingsRepository(CreateDatabase(null).Database, new MongoLegacyReadDocumentMapper());

        await Assert.ThrowsAsync<ArgumentNullException>(() => repository.WriteCurrentAsync(null!, CancellationToken.None));
    }

    [Fact]
    public async Task Mongo_standings_repository_normalizes_null_optional_fields_and_covers_async_completion_paths()
    {
        var harness = CreateDatabase(null, completeAsynchronously: true);
        var repository = new MongoStandingsRepository(harness.Database, new MongoLegacyReadDocumentMapper());

        await repository.WriteCurrentAsync(
            new StandingsDocument(
            [
                new DriverStandingDocument(1, null!, null!, null!, 12, null!, null!),
            ],
            [
                new ConstructorStandingDocument(1, null!, 34, null!, null!),
            ],
            null!),
            CancellationToken.None);

        Assert.NotNull(harness.StoredDocument);
        Assert.Equal(string.Empty, harness.StoredDocument!["driverStandings"].AsBsonArray[0]["driverId"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["driverStandings"].AsBsonArray[0]["name"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["driverStandings"].AsBsonArray[0]["team"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["driverStandings"].AsBsonArray[0]["avatarUrl"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["driverStandings"].AsBsonArray[0]["color"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["constructorStandings"].AsBsonArray[0]["team"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["constructorStandings"].AsBsonArray[0]["color"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["constructorStandings"].AsBsonArray[0]["logoUrl"].AsString);
        Assert.Equal(string.Empty, harness.StoredDocument["updatedAt"].AsString);
    }

    private static HttpRequestMessage CloneRequest(HttpRequestMessage request)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri);
        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return clone;
    }

    private static MongoStandingsHarness CreateDatabase(BsonDocument? storedDocument, bool completeAsynchronously = false)
    {
        var requestedCollectionNames = new List<string>();
        IMongoDatabase? database = null;
        var currentDocument = storedDocument;
        database = ProxyFactory<IMongoDatabase>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoDatabase.GetCollection))
            {
                var collectionName = (string)args![0]!;
                requestedCollectionNames.Add(collectionName);
                return CreateCollection(
                    database!,
                    collectionName,
                    () => currentDocument,
                    document => currentDocument = document,
                    completeAsynchronously);
            }

            if (method.Name == "get_DatabaseNamespace")
            {
                return new DatabaseNamespace("fantaf1_porting_tests");
            }

            throw new NotSupportedException($"Unexpected IMongoDatabase call: {method.Name}");
        });

        return new MongoStandingsHarness(database, requestedCollectionNames, () => currentDocument);
    }

    private static IMongoCollection<BsonDocument> CreateCollection(
        IMongoDatabase database,
        string collectionName,
        Func<BsonDocument?> readCurrentDocument,
        Action<BsonDocument> writeCurrentDocument,
        bool completeAsynchronously)
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
                return CreateCursor(method, [readCurrentDocument()], args);
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindAsync))
            {
                var cursor = CreateCursor(method, [readCurrentDocument()], args);
                return CreateCoverageTask(method.ReturnType, cursor, completeAsynchronously);
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindOneAndReplaceAsync))
            {
                var replacement = (BsonDocument)args![1]!;
                writeCurrentDocument(replacement);
                return CreateCoverageTask(method.ReturnType, replacement, completeAsynchronously);
            }

            throw new NotSupportedException($"Unexpected IMongoCollection call: {method.Name}");
        });
    }

    private static object CreateCursor(MethodInfo method, IReadOnlyList<BsonDocument?> documents, object?[]? args)
    {
        if (method.GetGenericArguments().Single() != typeof(BsonDocument))
        {
            throw new NotSupportedException("Only BsonDocument projections are supported by the test double.");
        }

        var results = documents.Where(document => document is not null).Cast<BsonDocument>().ToArray();
        var findOptions = args!
            .OfType<FindOptions<BsonDocument, BsonDocument>>()
            .SingleOrDefault();

        if (findOptions?.Limit is int limit)
        {
            results = results.Take(limit).ToArray();
        }

        return new SingleBatchAsyncCursor<BsonDocument>(results);
    }

    private static object CreateCoverageTask(Type taskType, object? result, bool completeAsynchronously)
    {
        var resultType = taskType.GetGenericArguments().Single();
        var methodName = completeAsynchronously
            ? nameof(CreateAsynchronousTask)
            : nameof(CreateCompletedTask);
        var factoryMethod = typeof(StandingsInfrastructureTests)
            .GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static)!
            .MakeGenericMethod(resultType);

        return factoryMethod.Invoke(null, [result])!;
    }

    private static Task<T> CreateCompletedTask<T>(T result)
    {
        return Task.FromResult(result);
    }

    private static async Task<T> CreateAsynchronousTask<T>(T result)
    {
        await Task.Yield();
        return result;
    }

    private sealed record MongoStandingsHarness(
        IMongoDatabase Database,
        List<string> RequestedCollectionNames,
        Func<BsonDocument?> ReadStoredDocument)
    {
        public BsonDocument? StoredDocument => ReadStoredDocument();
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class RecordingHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public RecordingHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_responseFactory(request));
        }
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
