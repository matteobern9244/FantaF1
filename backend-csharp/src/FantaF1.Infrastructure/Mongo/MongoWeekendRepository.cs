using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Domain.ReadModels;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoWeekendRepository : MongoRepository<WeekendDocument, string>, IWeekendRepository
{
    private readonly MongoLegacyReadDocumentMapper _mapper;
    private readonly MongoLegacyWriteDocumentMapper _writeMapper;

    public MongoWeekendRepository(
        IMongoDatabase database,
        MongoLegacyReadDocumentMapper mapper,
        MongoLegacyWriteDocumentMapper writeMapper)
        : base(database, MongoCollectionNames.Weekends)
    {
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _writeMapper = writeMapper ?? throw new ArgumentNullException(nameof(writeMapper));
    }

    public override async Task<WeekendDocument?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var document = await Collection
            .Find(Builders<BsonDocument>.Filter.Eq("_id", id))
            .FirstOrDefaultAsync(cancellationToken);

        return document is null ? null : _mapper.MapWeekend(document);
    }

    public override async Task<IReadOnlyList<WeekendDocument>> GetAllAsync(CancellationToken cancellationToken)
    {
        var documents = await Collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortBy(document => document["roundNumber"])
            .ToListAsync(cancellationToken);

        return documents.Select(_mapper.MapWeekend).ToArray();
    }

    public async Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
    {
        return await GetAllAsync(cancellationToken);
    }

    public async Task WriteAllAsync(IReadOnlyList<WeekendDocument> weekends, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(weekends);

        await Collection.DeleteManyAsync(FilterDefinition<BsonDocument>.Empty, cancellationToken);
        if (weekends.Count == 0)
        {
            return;
        }

        await Collection.InsertManyAsync(weekends.Select(_writeMapper.MapWeekend).ToArray(), cancellationToken: cancellationToken);
    }

    public async Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(meetingKey);
        ArgumentNullException.ThrowIfNull(lookup);

        var existingDocument = await Collection
            .Find(Builders<BsonDocument>.Filter.Eq("meetingKey", meetingKey))
            .FirstOrDefaultAsync(cancellationToken);
        var persistedHighlightsVideoUrl = GetNullableString(existingDocument, "highlightsVideoUrl");
        var preservePersistedHighlights = !string.IsNullOrWhiteSpace(persistedHighlightsVideoUrl)
            && string.IsNullOrWhiteSpace(lookup.HighlightsVideoUrl)
            && string.Equals(lookup.HighlightsLookupStatus, "missing", StringComparison.Ordinal);

        var updateDefinition = Builders<BsonDocument>.Update
            .Set("highlightsVideoUrl", preservePersistedHighlights ? persistedHighlightsVideoUrl : lookup.HighlightsVideoUrl ?? string.Empty)
            .Set(
                "highlightsLookupCheckedAt",
                preservePersistedHighlights
                    ? GetNullableString(existingDocument, "highlightsLookupCheckedAt") ?? string.Empty
                    : lookup.HighlightsLookupCheckedAt ?? string.Empty)
            .Set(
                "highlightsLookupStatus",
                preservePersistedHighlights
                    ? GetNullableString(existingDocument, "highlightsLookupStatus") ?? string.Empty
                    : lookup.HighlightsLookupStatus ?? string.Empty)
            .Set(
                "highlightsLookupSource",
                preservePersistedHighlights
                    ? GetNullableString(existingDocument, "highlightsLookupSource") ?? string.Empty
                    : lookup.HighlightsLookupSource ?? string.Empty);

        await Collection.UpdateOneAsync(
            Builders<BsonDocument>.Filter.Eq("meetingKey", meetingKey),
            updateDefinition,
            cancellationToken: cancellationToken);
    }

    public override Task AddAsync(WeekendDocument entity, CancellationToken cancellationToken)
    {
        return Collection.InsertOneAsync(_writeMapper.MapWeekend(entity), cancellationToken: cancellationToken);
    }

    public override Task UpdateAsync(WeekendDocument entity, CancellationToken cancellationToken)
    {
        return Collection.ReplaceOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", entity.Id),
            _writeMapper.MapWeekend(entity),
            cancellationToken: cancellationToken);
    }

    protected override WeekendDocument MapToEntity(BsonDocument document) => _mapper.MapWeekend(document);
    protected override BsonDocument MapToDocument(WeekendDocument entity) => _writeMapper.MapWeekend(entity);

    private static string? GetNullableString(BsonDocument? document, string fieldName)
    {
        var value = document?.GetValue(fieldName, BsonNull.Value);
        return value is null || value.IsBsonNull ? null : value.AsString;
    }
}
