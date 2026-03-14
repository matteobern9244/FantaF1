using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoWeekendRepository : IWeekendRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;
    private readonly MongoLegacyReadDocumentMapper _mapper;
    private readonly MongoLegacyWriteDocumentMapper _writeMapper;

    public MongoWeekendRepository(IMongoDatabase database, MongoLegacyReadDocumentMapper mapper)
        : this(database, mapper, new MongoLegacyWriteDocumentMapper())
    {
    }

    public MongoWeekendRepository(
        IMongoDatabase database,
        MongoLegacyReadDocumentMapper mapper,
        MongoLegacyWriteDocumentMapper writeMapper)
    {
        ArgumentNullException.ThrowIfNull(database);

        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.Weekends);
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _writeMapper = writeMapper ?? throw new ArgumentNullException(nameof(writeMapper));
    }

    public async Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        var documents = await _collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortBy(document => document["roundNumber"])
            .ToListAsync(cancellationToken);

        return documents.Select(_mapper.MapWeekend).ToArray();
    }

    public async Task WriteAllAsync(IReadOnlyList<WeekendDocument> weekends, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(weekends);

        await _collection.DeleteManyAsync(FilterDefinition<BsonDocument>.Empty, cancellationToken);
        if (weekends.Count == 0)
        {
            return;
        }

        await _collection.InsertManyAsync(weekends.Select(_writeMapper.MapWeekend).ToArray(), cancellationToken: cancellationToken);
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
