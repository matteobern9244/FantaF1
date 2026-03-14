using System.Security.Cryptography;
using System.Text;
using FantaF1.Infrastructure.Authentication;

namespace FantaF1.Tests.Unit;

public sealed class NodeCompatibleScryptPasswordHasherTests
{
    [Fact]
    public void Hash_password_matches_the_known_node_compatible_vector()
    {
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var password = CreatePassword("subphase-4-valid-password-seed");

        var actualHash = hasher.HashPassword(password, "5ec87a3ee93060118f8b9187d785f9bf");

        Assert.Equal(
            "4619e5b11b8e4e91b0cb3e219374bab9ae00b43a11f46e233d4e48cc28172c06dd8a0288af4850fa2bfb28392f9517666f80d88cbd0a0d85b3234a8d5b132a68",
            actualHash);
    }

    [Fact]
    public void Verify_returns_true_for_a_matching_hash_and_false_for_invalid_inputs()
    {
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var password = CreatePassword("subphase-4-matching-password");
        var invalidPassword = CreatePassword("subphase-4-non-matching-password");
        var expectedHashHex = hasher.HashPassword(password, "node-compatible-salt");

        Assert.True(hasher.Verify(password, "node-compatible-salt", expectedHashHex));
        Assert.False(hasher.Verify(invalidPassword, "node-compatible-salt", expectedHashHex));
        Assert.False(hasher.Verify(password, "node-compatible-salt", "***"));
        Assert.False(hasher.Verify(password, "node-compatible-salt", expectedHashHex[..^2]));
    }

    [Fact]
    public void Hash_password_and_verify_reject_null_arguments()
    {
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var password = CreatePassword("subphase-4-null-guard-password");

        Assert.Throws<ArgumentNullException>(() => hasher.HashPassword(null!, "salt"));
        Assert.Throws<ArgumentNullException>(() => hasher.HashPassword(password, null!));
        Assert.Throws<ArgumentNullException>(() => hasher.Verify(null!, "salt", "abc"));
        Assert.Throws<ArgumentNullException>(() => hasher.Verify(password, null!, "abc"));
        Assert.Throws<ArgumentNullException>(() => hasher.Verify(password, "salt", null!));
    }

    private static string CreatePassword(string seedLabel)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(seedLabel))).ToLowerInvariant();
    }
}
