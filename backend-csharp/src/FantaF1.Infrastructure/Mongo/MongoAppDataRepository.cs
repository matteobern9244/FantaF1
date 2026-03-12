using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.SaveValidation;
using MongoDB.Bson;
using MongoDB.Driver;

namespace FantaF1.Infrastructure.Mongo;

public sealed class MongoAppDataRepository : IAppDataRepository
{
    private readonly IMongoCollection<BsonDocument> _collection;
    private readonly MongoLegacyReadDocumentMapper _mapper;
    private readonly MongoLegacyWriteDocumentMapper _writeMapper;
    private readonly ParticipantRosterValidator _participantRosterValidator;
    private readonly IClock _clock;

    public MongoAppDataRepository(
        IMongoDatabase database,
        MongoLegacyReadDocumentMapper mapper,
        MongoLegacyWriteDocumentMapper writeMapper,
        ParticipantRosterValidator participantRosterValidator,
        IClock clock)
    {
        ArgumentNullException.ThrowIfNull(database);

        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.AppDatas);
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _writeMapper = writeMapper ?? throw new ArgumentNullException(nameof(writeMapper));
        _participantRosterValidator = participantRosterValidator ?? throw new ArgumentNullException(nameof(participantRosterValidator));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public async Task<AppDataDocument?> ReadLatestAsync(CancellationToken cancellationToken)
    {
        var document = await _collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortByDescending(document => document["createdAt"])
            .FirstOrDefaultAsync(cancellationToken);

        return document is null ? null : _mapper.MapAppData(document);
    }

    public async Task<IReadOnlyList<string>?> ReadPersistedParticipantRosterAsync(CancellationToken cancellationToken)
    {
        try
        {
            var latestDocument = await ReadLatestAsync(cancellationToken);
            return _participantRosterValidator.ResolveParticipantRoster(latestDocument?.Users);
        }
        catch
        {
            return null;
        }
    }

    public async Task WriteAsync(AppDataDocument document, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(document);

        var existingDocument = await _collection
            .Find(FilterDefinition<BsonDocument>.Empty)
            .SortByDescending(existing => existing["createdAt"])
            .FirstOrDefaultAsync(cancellationToken);
        var mappedDocument = _writeMapper.MapAppData(document, _clock.UtcNow, existingDocument);

        if (existingDocument is null)
        {
            await _collection.InsertOneAsync(mappedDocument, null, cancellationToken);
            return;
        }

        await _collection.ReplaceOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", existingDocument["_id"]),
            mappedDocument,
            new ReplaceOptions
            {
                IsUpsert = true,
            },
            cancellationToken);
    }
}
