using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoStandingsRepository : IStandingsRepository
{
    private const string CurrentCacheKey = "current";

    private readonly IMongoCollection<BsonDocument> _collection;
    private readonly MongoLegacyReadDocumentMapper _mapper;

    public MongoStandingsRepository(IMongoDatabase database, MongoLegacyReadDocumentMapper mapper)
    {
        ArgumentNullException.ThrowIfNull(database);

        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.StandingsCaches);
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public async Task<StandingsDocument> ReadCurrentAsync(CancellationToken cancellationToken)
    {
        var document = await _collection
            .Find(new BsonDocument("cacheKey", CurrentCacheKey))
            .Limit(1)
            .FirstOrDefaultAsync(cancellationToken);

        return _mapper.MapStandings(document);
    }

    public async Task WriteCurrentAsync(StandingsDocument document, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(document);

        var replacement = new BsonDocument
        {
            ["cacheKey"] = CurrentCacheKey,
            ["driverStandings"] = new BsonArray(document.DriverStandings.Select(MapDriverStanding)),
            ["constructorStandings"] = new BsonArray(document.ConstructorStandings.Select(MapConstructorStanding)),
            ["updatedAt"] = document.UpdatedAt ?? string.Empty,
        };

        await _collection.FindOneAndReplaceAsync(
            new BsonDocument("cacheKey", CurrentCacheKey),
            replacement,
            new FindOneAndReplaceOptions<BsonDocument>
            {
                IsUpsert = true,
                ReturnDocument = ReturnDocument.After,
            },
            cancellationToken);
    }

    private static BsonDocument MapDriverStanding(DriverStandingDocument standing)
    {
        return new BsonDocument
        {
            ["position"] = standing.Position,
            ["driverId"] = standing.DriverId ?? string.Empty,
            ["name"] = standing.Name ?? string.Empty,
            ["team"] = standing.Team ?? string.Empty,
            ["points"] = standing.Points,
            ["avatarUrl"] = standing.AvatarUrl ?? string.Empty,
            ["color"] = standing.Color ?? string.Empty,
        };
    }

    private static BsonDocument MapConstructorStanding(ConstructorStandingDocument standing)
    {
        return new BsonDocument
        {
            ["position"] = standing.Position,
            ["team"] = standing.Team ?? string.Empty,
            ["points"] = standing.Points,
            ["color"] = standing.Color ?? string.Empty,
            ["logoUrl"] = standing.LogoUrl ?? string.Empty,
        };
    }
}
