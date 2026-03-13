using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Infrastructure.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;
using Microsoft.Extensions.Options;

namespace FantaF1.Infrastructure.Authentication;

public sealed class ContractAdminCredentialRepository : IAdminCredentialRepository
{
    private readonly NodeCompatibleScryptPasswordHasher _passwordHasher;
    private readonly ContractAdminCredentialSeedOptions _seedOptions;
    private readonly IMongoCollection<BsonDocument>? _collection;

    public ContractAdminCredentialRepository(
        IOptions<ContractAdminCredentialSeedOptions> seedOptions,
        NodeCompatibleScryptPasswordHasher passwordHasher)
    {
        ArgumentNullException.ThrowIfNull(seedOptions);

        _seedOptions = seedOptions.Value;
        _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
    }

    public ContractAdminCredentialRepository(
        IOptions<ContractAdminCredentialSeedOptions> seedOptions,
        NodeCompatibleScryptPasswordHasher passwordHasher,
        IMongoDatabase database)
    {
        ArgumentNullException.ThrowIfNull(seedOptions);

        _seedOptions = seedOptions.Value;
        _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
        ArgumentNullException.ThrowIfNull(database);
        _collection = database.GetCollection<BsonDocument>(MongoCollectionNames.AdminCredentials);
    }

    public async Task EnsureDefaultCredentialAsync(CancellationToken cancellationToken)
    {
        if (_collection is null)
        {
            return;
        }

        var existingCredential = await _collection
            .Find(Builders<BsonDocument>.Filter.Eq("role", "admin"))
            .Limit(1)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingCredential is not null)
        {
            return;
        }

        var seedDocument = new BsonDocument
        {
            ["role"] = "admin",
            ["passwordHash"] = _seedOptions.PasswordHashHex,
            ["passwordSalt"] = _seedOptions.PasswordSalt,
        };

        try
        {
            await _collection.InsertOneAsync(seedDocument, cancellationToken: cancellationToken);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // A concurrent bootstrap already seeded the admin credential.
        }
    }

    public async Task<bool> VerifyPasswordAsync(string password, CancellationToken cancellationToken)
    {
        var normalizedPassword = password ?? string.Empty;
        if (_collection is null)
        {
            return _passwordHasher.Verify(
                normalizedPassword,
                _seedOptions.PasswordSalt,
                _seedOptions.PasswordHashHex);
        }

        var credential = await _collection
            .Find(Builders<BsonDocument>.Filter.Eq("role", "admin"))
            .Limit(1)
            .FirstOrDefaultAsync(cancellationToken);

        if (credential is null)
        {
            return false;
        }

        var passwordSalt = credential.TryGetValue("passwordSalt", out var saltValue) && saltValue.IsString
            ? saltValue.AsString
            : string.Empty;
        var passwordHash = credential.TryGetValue("passwordHash", out var hashValue) && hashValue.IsString
            ? hashValue.AsString
            : string.Empty;

        if (string.IsNullOrWhiteSpace(passwordSalt) || string.IsNullOrWhiteSpace(passwordHash))
        {
            return false;
        }

        return _passwordHasher.Verify(normalizedPassword, passwordSalt, passwordHash);
    }
}
