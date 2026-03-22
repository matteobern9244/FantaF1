using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoPushSubscriptionRepository : MongoRepository<PushSubscriptionDocument, string>, IPushSubscriptionRepository
{
    public MongoPushSubscriptionRepository(IMongoDatabase database)
        : base(database, MongoCollectionNames.PushSubscriptions)
    {
    }

    public override async Task<PushSubscriptionDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var document = await Collection
            .Find(Builders<BsonDocument>.Filter.Eq("_id", id))
            .FirstOrDefaultAsync(cancellationToken);

        return document is null ? null : MapToEntity(document);
    }

    public override async Task AddAsync(PushSubscriptionDocument entity, CancellationToken cancellationToken)
    {
        await UpsertAsync(entity, cancellationToken);
    }

    public override async Task UpdateAsync(PushSubscriptionDocument entity, CancellationToken cancellationToken)
    {
        await UpsertAsync(entity, cancellationToken);
    }

    public override async Task DeleteAsync(string endpoint, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(endpoint, nameof(endpoint));

        await base.DeleteAsync(endpoint.Trim(), cancellationToken);
    }

    public async Task UpsertAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(subscription);
        ArgumentException.ThrowIfNullOrWhiteSpace(subscription.Endpoint, nameof(subscription));

        await Collection.ReplaceOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", subscription.Endpoint),
            MapToDocument(subscription),
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }

    protected override PushSubscriptionDocument MapToEntity(BsonDocument document)
    {
        return new PushSubscriptionDocument(
            document["_id"].AsString,
            GetNullableString(document, "p256dh"),
            GetNullableString(document, "auth"),
            GetNullableDouble(document, "expirationTime"));
    }

    protected override BsonDocument MapToDocument(PushSubscriptionDocument entity)
    {
        return new BsonDocument
        {
            ["_id"] = entity.Endpoint,
            ["endpoint"] = entity.Endpoint,
            ["p256dh"] = entity.P256dh is null ? BsonNull.Value : entity.P256dh,
            ["auth"] = entity.Auth is null ? BsonNull.Value : entity.Auth,
            ["expirationTime"] = entity.ExpirationTime is null ? BsonNull.Value : BsonValue.Create(entity.ExpirationTime.Value),
        };
    }

    private static string? GetNullableString(BsonDocument document, string fieldName)
    {
        var value = document.GetValue(fieldName, BsonNull.Value);
        return value is null || value.IsBsonNull ? null : value.AsString;
    }

    private static double? GetNullableDouble(BsonDocument document, string fieldName)
    {
        var value = document.GetValue(fieldName, BsonNull.Value);
        return value is null || value.IsBsonNull ? null : value.ToDouble();
    }
}
