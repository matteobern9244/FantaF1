using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoAppDataRepository : IAppDataRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;
    private readonly MongoLegacyReadDocumentMapper _mapper;

    public MongoAppDataRepository(IMongoDatabase database, MongoLegacyReadDocumentMapper mapper)
    {
        ArgumentNullException.ThrowIfNull(database);

        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.AppDatas);
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public async Task<AppDataDocument?> ReadLatestAsync(CancellationToken cancellationToken)
    {
        var document = await _collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortByDescending(document => document["createdAt"])
            .FirstOrDefaultAsync(cancellationToken);

        return document is null ? null : _mapper.MapAppData(document);
    }
}
