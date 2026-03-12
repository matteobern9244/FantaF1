using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoDriverRepository : IDriverRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;
    private readonly MongoLegacyReadDocumentMapper _mapper;

    public MongoDriverRepository(IMongoDatabase database, MongoLegacyReadDocumentMapper mapper)
    {
        ArgumentNullException.ThrowIfNull(database);

        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.Drivers);
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public async Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        var documents = await _collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortBy(document => document["name"])
            .ToListAsync(cancellationToken);

        return documents.Select(_mapper.MapDriver).ToArray();
    }
}
