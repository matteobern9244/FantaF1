using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoStandingsRepository : MongoRepository<StandingsDocument, string>, IStandingsRepository
{
    private const string CurrentCacheKey = "current";

    private readonly MongoLegacyReadDocumentMapper _mapper;

    public MongoStandingsRepository(IMongoDatabase database, MongoLegacyReadDocumentMapper mapper)
        : base(database, MongoCollectionNames.StandingsCaches)
    {
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public override async Task<StandingsDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        return await ReadCurrentAsync(cancellationToken);
    }

    public async Task<StandingsDocument> ReadCurrentAsync(CancellationToken cancellationToken)
    {
        var document = await Collection
            .Find(new BsonDocument("cacheKey", CurrentCacheKey))
            .Limit(1)
            .FirstOrDefaultAsync(cancellationToken);

        return _mapper.MapStandings(document);
    }

    public async Task WriteCurrentAsync(StandingsDocument document, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(document);

        var replacement = MapToDocument(document);

        await Collection.FindOneAndReplaceAsync(
            new BsonDocument("cacheKey", CurrentCacheKey),
            replacement,
            new FindOneAndReplaceOptions<BsonDocument>
            {
                IsUpsert = true,
                ReturnDocument = ReturnDocument.After,
            },
            cancellationToken);
    }

    public override Task AddAsync(StandingsDocument entity, CancellationToken cancellationToken)
    {
        return WriteCurrentAsync(entity, cancellationToken);
    }

    public override Task UpdateAsync(StandingsDocument entity, CancellationToken cancellationToken)
    {
        return WriteCurrentAsync(entity, cancellationToken);
    }

    protected override StandingsDocument MapToEntity(BsonDocument document) => _mapper.MapStandings(document);

    protected override BsonDocument MapToDocument(StandingsDocument entity)
    {
        return new BsonDocument
        {
            ["cacheKey"] = CurrentCacheKey,
            ["driverStandings"] = new BsonArray(entity.DriverStandings.Select(MapDriverStanding)),
            ["constructorStandings"] = new BsonArray(entity.ConstructorStandings.Select(MapConstructorStanding)),
            ["updatedAt"] = entity.UpdatedAt ?? string.Empty,
        };
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
