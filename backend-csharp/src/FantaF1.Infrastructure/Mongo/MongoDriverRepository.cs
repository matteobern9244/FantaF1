using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoDriverRepository : IDriverRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;
    private readonly MongoLegacyReadDocumentMapper _mapper;
    private readonly MongoLegacyWriteDocumentMapper _writeMapper;

    public MongoDriverRepository(IMongoDatabase database, MongoLegacyReadDocumentMapper mapper)
        : this(database, mapper, new MongoLegacyWriteDocumentMapper())
    {
    }

    public MongoDriverRepository(
        IMongoDatabase database,
        MongoLegacyReadDocumentMapper mapper,
        MongoLegacyWriteDocumentMapper writeMapper)
    {
        ArgumentNullException.ThrowIfNull(database);

        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.Drivers);
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _writeMapper = writeMapper ?? throw new ArgumentNullException(nameof(writeMapper));
    }

    public async Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        var documents = await _collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortBy(document => document["name"])
            .ToListAsync(cancellationToken);

        return documents.Select(_mapper.MapDriver).ToArray();
    }

    public async Task WriteAllAsync(IReadOnlyList<DriverDocument> drivers, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(drivers);

        await _collection.DeleteManyAsync(FilterDefinition<BsonDocument>.Empty, cancellationToken);
        if (drivers.Count == 0)
        {
            return;
        }

        await _collection.InsertManyAsync(drivers.Select(_writeMapper.MapDriver).ToArray(), cancellationToken: cancellationToken);
    }
}
