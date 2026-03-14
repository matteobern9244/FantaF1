using System.Security.Cryptography;
using System.Text;
using Org.BouncyCastle.Crypto.Generators;

namespace FantaF1.Infrastructure.Authentication;

public sealed class NodeCompatibleScryptPasswordHasher
{
    private const int CostParameter = 16384;
    private const int BlockSize = 8;
    private const int Parallelization = 1;
    private const int DerivedKeyLength = 64;

    public string HashPassword(string password, string salt)
    {
        ArgumentNullException.ThrowIfNull(password);
        ArgumentNullException.ThrowIfNull(salt);

        var derivedBytes = SCrypt.Generate(
            Encoding.UTF8.GetBytes(password),
            Encoding.UTF8.GetBytes(salt),
            CostParameter,
            BlockSize,
            Parallelization,
            DerivedKeyLength);

        return Convert.ToHexString(derivedBytes).ToLowerInvariant();
    }

    public bool Verify(string password, string salt, string expectedHashHex)
    {
        ArgumentNullException.ThrowIfNull(password);
        ArgumentNullException.ThrowIfNull(salt);
        ArgumentNullException.ThrowIfNull(expectedHashHex);

        byte[] expectedHashBytes;

        try
        {
            expectedHashBytes = Convert.FromHexString(expectedHashHex);
        }
        catch (FormatException)
        {
            return false;
        }

        var computedHashBytes = Convert.FromHexString(HashPassword(password, salt));

        return expectedHashBytes.Length == computedHashBytes.Length
            && CryptographicOperations.FixedTimeEquals(expectedHashBytes, computedHashBytes);
    }
}
