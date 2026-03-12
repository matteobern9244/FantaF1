using FantaF1.Application.Abstractions.Persistence;
using Microsoft.Extensions.Options;

namespace FantaF1.Infrastructure.Authentication;

public sealed class ContractAdminCredentialRepository : IAdminCredentialRepository
{
    private readonly NodeCompatibleScryptPasswordHasher _passwordHasher;
    private readonly ContractAdminCredentialSeedOptions _seedOptions;

    // Temporary seam for Subphase 4 until Mongo-backed admin credentials arrive in Subphase 8.
    public ContractAdminCredentialRepository(
        IOptions<ContractAdminCredentialSeedOptions> seedOptions,
        NodeCompatibleScryptPasswordHasher passwordHasher)
    {
        ArgumentNullException.ThrowIfNull(seedOptions);

        _seedOptions = seedOptions.Value;
        _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
    }

    public Task EnsureDefaultCredentialAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public Task<bool> VerifyPasswordAsync(string password, CancellationToken cancellationToken)
    {
        var normalizedPassword = password ?? string.Empty;
        var isValid = _passwordHasher.Verify(
            normalizedPassword,
            _seedOptions.PasswordSalt,
            _seedOptions.PasswordHashHex);

        return Task.FromResult(isValid);
    }
}
