using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.Common;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public abstract class MongoRepository<TEntity, TId> : IRepository<TEntity, TId>
    where TEntity : class, IEntity<TId>
{
    protected readonly IMongoCollection<BsonDocument> Collection;

    protected MongoRepository(IMongoDatabase database, string collectionName)
    {
        ArgumentNullException.ThrowIfNull(database);
        Collection = database.GetCollection<BsonDocument>(collectionName);
    }

    public abstract Task<TEntity?> GetByIdAsync(TId id, CancellationToken cancellationToken);

    public virtual async Task<IReadOnlyList<TEntity>> GetAllAsync(CancellationToken cancellationToken)
    {
        var documents = await Collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .ToListAsync(cancellationToken);

        return documents.Select(MapToEntity).ToArray();
    }

    public abstract Task AddAsync(TEntity entity, CancellationToken cancellationToken);

    public abstract Task UpdateAsync(TEntity entity, CancellationToken cancellationToken);

    public virtual async Task DeleteAsync(TId id, CancellationToken cancellationToken)
    {
        var filter = Builders<BsonDocument>.Filter.Eq("_id", id?.ToString());
        await Collection.DeleteOneAsync(filter, cancellationToken);
    }

    protected abstract TEntity MapToEntity(BsonDocument document);
    protected abstract BsonDocument MapToDocument(TEntity entity);
}
