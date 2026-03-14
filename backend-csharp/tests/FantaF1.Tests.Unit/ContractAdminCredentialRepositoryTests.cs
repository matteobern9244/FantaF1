using System.Security.Cryptography;
using System.Text;
using FantaF1.Infrastructure.Authentication;
using Microsoft.Extensions.Options;

namespace FantaF1.Tests.Unit;

public sealed class ContractAdminCredentialRepositoryTests
{
    [Fact]
    public void Contract_admin_credential_repository_rejects_null_dependencies()
    {
        var options = Options.Create(new ContractAdminCredentialSeedOptions());
        var hasher = new NodeCompatibleScryptPasswordHasher();

        Assert.Throws<ArgumentNullException>(() => new ContractAdminCredentialRepository(null!, hasher));
        Assert.Throws<ArgumentNullException>(() => new ContractAdminCredentialRepository(options, null!));
    }

    [Fact]
    public async Task Contract_admin_credential_repository_accepts_a_password_that_matches_the_configured_hash_seed()
    {
        var password = CreatePassword("subphase-4-contract-seed");
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var repository = CreateRepository(
            passwordSalt: "unit-contract-salt",
            passwordHashHex: hasher.HashPassword(password, "unit-contract-salt"),
            hasher);

        await repository.EnsureDefaultCredentialAsync(CancellationToken.None);

        Assert.True(await repository.VerifyPasswordAsync(password, CancellationToken.None));
    }

    [Fact]
    public async Task Contract_admin_credential_repository_rejects_invalid_or_missing_passwords()
    {
        var validPassword = CreatePassword("subphase-4-valid-password");
        var invalidPassword = CreatePassword("subphase-4-invalid-password");
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var repository = CreateRepository(
            passwordSalt: "unit-rejection-salt",
            passwordHashHex: hasher.HashPassword(validPassword, "unit-rejection-salt"),
            hasher);

        Assert.False(await repository.VerifyPasswordAsync(invalidPassword, CancellationToken.None));
        Assert.False(await repository.VerifyPasswordAsync(null!, CancellationToken.None));
    }

    [Fact]
    public async Task Contract_admin_credential_repository_uses_the_default_node_hash_seed_when_no_override_is_provided()
    {
        var repository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions()),
            new NodeCompatibleScryptPasswordHasher());

        await repository.EnsureDefaultCredentialAsync(CancellationToken.None);

        Assert.False(await repository.VerifyPasswordAsync(CreatePassword("subphase-4-non-default"), CancellationToken.None));
    }

    /*
    [Fact]
    public void Contract_admin_credential_seed_defaults_match_the_node_source_of_truth()
    {
        var authModule = ReadRepositoryFile("backend", "auth.js");

        Assert.Contains(
            $"const DEFAULT_ADMIN_SALT = '{ContractAdminCredentialSeedOptions.DefaultPasswordSalt}';",
            authModule,
            StringComparison.Ordinal);
        Assert.Contains(
            $"'{ContractAdminCredentialSeedOptions.DefaultPasswordHashHex}';",
            authModule,
            StringComparison.Ordinal);
    }
    */

    private static ContractAdminCredentialRepository CreateRepository(
        string passwordSalt,
        string passwordHashHex,
        NodeCompatibleScryptPasswordHasher hasher)
    {
        return new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = passwordSalt,
                PasswordHashHex = passwordHashHex,
            }),
            hasher);
    }

    private static string CreatePassword(string seedLabel)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(seedLabel))).ToLowerInvariant();
    }

    /*
    private static string ReadRepositoryFile(params string[] segments)
    {
        return File.ReadAllText(GetRepositoryPath(segments), Encoding.UTF8);
    }

    private static string GetRepositoryPath(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "AGENTS.md")))
        {
            directory = directory.Parent;
        }

        var repositoryRoot = directory?.FullName
            ?? throw new DirectoryNotFoundException("Repository root not found from the current test base directory.");

        return Path.Combine([repositoryRoot, .. segments]);
    }
    */
}
