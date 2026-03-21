using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoDriverRepository : MongoRepository<DriverDocument, string>, IDriverRepository
{
    private readonly MongoLegacyReadDocumentMapper _mapper;
    private readonly MongoLegacyWriteDocumentMapper _writeMapper;

    public MongoDriverRepository(
        IMongoDatabase database,
        MongoLegacyReadDocumentMapper mapper,
        MongoLegacyWriteDocumentMapper writeMapper)
        : base(database, MongoCollectionNames.Drivers)
    {
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _writeMapper = writeMapper ?? throw new ArgumentNullException(nameof(writeMapper));
    }

    public override async Task<DriverDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var document = await Collection
            .Find(Builders<BsonDocument>.Filter.Eq("_id", id))
            .FirstOrDefaultAsync(cancellationToken);

        return document is null ? null : _mapper.MapDriver(document);
    }

    public override async Task<IReadOnlyList<DriverDocument>> GetAllAsync(CancellationToken cancellationToken)
    {
        var documents = await Collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortBy(document => document["name"])
            .ToListAsync(cancellationToken);

        return documents.Select(_mapper.MapDriver).ToArray();
    }

    public async Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        return await GetAllAsync(cancellationToken);
    }

    public async Task WriteAllAsync(IReadOnlyList<DriverDocument> drivers, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(drivers);

        await Collection.DeleteManyAsync(FilterDefinition<BsonDocument>.Empty, cancellationToken);
        if (drivers.Count == 0)
        {
            return;
        }

        await Collection.InsertManyAsync(drivers.Select(_writeMapper.MapDriver).ToArray(), cancellationToken: cancellationToken);
    }

    public override Task AddAsync(DriverDocument entity, CancellationToken cancellationToken)
    {
        return Collection.InsertOneAsync(_writeMapper.MapDriver(entity), cancellationToken: cancellationToken);
    }

    public override Task UpdateAsync(DriverDocument entity, CancellationToken cancellationToken)
    {
        return Collection.ReplaceOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", entity.Id),
            _writeMapper.MapDriver(entity),
            cancellationToken: cancellationToken);
    }

    protected override DriverDocument MapToEntity(BsonDocument document) => _mapper.MapDriver(document);
    protected override BsonDocument MapToDocument(DriverDocument entity) => _writeMapper.MapDriver(entity);
}
