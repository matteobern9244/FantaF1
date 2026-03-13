using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoWeekendRepository : IWeekendRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;
    private readonly MongoLegacyReadDocumentMapper _mapper;

    public MongoWeekendRepository(IMongoDatabase database, MongoLegacyReadDocumentMapper mapper)
    {
        ArgumentNullException.ThrowIfNull(database);

        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.Weekends);
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public async Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        var documents = await _collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortBy(document => document["roundNumber"])
            .ToListAsync(cancellationToken);

        return documents.Select(_mapper.MapWeekend).ToArray();
    }

    public async Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(meetingKey);
        ArgumentNullException.ThrowIfNull(lookup);

        var updateDefinition = Builders<BsonDocument>.Update
            .Set("highlightsVideoUrl", lookup.HighlightsVideoUrl ?? string.Empty)
            .Set("highlightsLookupCheckedAt", lookup.HighlightsLookupCheckedAt ?? string.Empty)
            .Set("highlightsLookupStatus", lookup.HighlightsLookupStatus ?? string.Empty)
            .Set("highlightsLookupSource", lookup.HighlightsLookupSource ?? string.Empty);

        await _collection.UpdateOneAsync(
            Builders<BsonDocument>.Filter.Eq("meetingKey", meetingKey),
            updateDefinition,
            cancellationToken: cancellationToken);
    }
}
