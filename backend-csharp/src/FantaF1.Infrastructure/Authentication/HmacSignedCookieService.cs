using System.Security.Cryptography;
using System.Text;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using Microsoft.Extensions.Configuration;

namespace FantaF1.Infrastructure.Authentication;

public sealed class HmacSignedCookieService : ISignedCookieService
{
    private readonly byte[] _secretBytes;

    public HmacSignedCookieService(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var configuredSecret = configuration[AdminSessionContract.SessionSecretEnvironmentVariableName];
        var secret = string.IsNullOrWhiteSpace(configuredSecret)
            ? AdminSessionContract.DefaultSessionSecret
            : configuredSecret;

        _secretBytes = Encoding.UTF8.GetBytes(secret);
    }

    public string Sign(string value)
    {
        ArgumentNullException.ThrowIfNull(value);

        return $"{value}.{ComputeSignature(value)}";
    }

    public bool TryVerify(string signedValue, out string? unsignedValue)
    {
        unsignedValue = null;

        if (string.IsNullOrEmpty(signedValue))
        {
            return false;
        }

        var separatorIndex = signedValue.IndexOf('.');
        if (separatorIndex <= 0 || separatorIndex == signedValue.Length - 1)
        {
            return false;
        }

        var payload = signedValue[..separatorIndex];
        var signature = signedValue[(separatorIndex + 1)..];
        var expectedSignature = ComputeSignature(payload);

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(signature),
                Encoding.UTF8.GetBytes(expectedSignature)))
        {
            return false;
        }

        unsignedValue = payload;
        return true;
    }

    private string ComputeSignature(string value)
    {
        using var hmac = new HMACSHA256(_secretBytes);
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(value)));
    }

    private static string Base64UrlEncode(byte[] value)
    {
        return Convert.ToBase64String(value)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
