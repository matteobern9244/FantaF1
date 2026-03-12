using System.Text.Json;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;

namespace FantaF1.Application.Services;

public sealed class AdminSessionCookieInspector
{
    private readonly IClock _clock;
    private readonly ISignedCookieService _signedCookieService;

    public AdminSessionCookieInspector(IClock clock, ISignedCookieService signedCookieService)
    {
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _signedCookieService = signedCookieService ?? throw new ArgumentNullException(nameof(signedCookieService));
    }

    public bool HasActiveAdminSession(string? cookieHeader)
    {
        var rawCookieValue = TryGetCookieValue(cookieHeader);
        if (string.IsNullOrEmpty(rawCookieValue))
        {
            return false;
        }

        if (!_signedCookieService.TryVerify(rawCookieValue, out var unsignedPayload) || string.IsNullOrEmpty(unsignedPayload))
        {
            return false;
        }

        try
        {
            using var payload = JsonDocument.Parse(Base64UrlDecode(unsignedPayload));
            var root = payload.RootElement;

            if (!root.TryGetProperty("role", out var roleProperty)
                || !string.Equals(roleProperty.GetString(), AdminSessionContract.AdminRole, StringComparison.Ordinal))
            {
                return false;
            }

            return !IsSessionExpired(root);
        }
        catch (JsonException)
        {
            return false;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private bool IsSessionExpired(JsonElement payload)
    {
        if (!payload.TryGetProperty("issuedAt", out var issuedAtProperty)
            || issuedAtProperty.ValueKind != JsonValueKind.Number
            || !issuedAtProperty.TryGetInt64(out var issuedAt))
        {
            return false;
        }

        return _clock.UtcNow.ToUnixTimeMilliseconds() - issuedAt > (long)AdminSessionContract.SessionTtl.TotalMilliseconds;
    }

    private static string? TryGetCookieValue(string? cookieHeader)
    {
        if (string.IsNullOrWhiteSpace(cookieHeader))
        {
            return null;
        }

        foreach (var chunk in cookieHeader.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            var trimmedChunk = chunk.Trim();
            var separatorIndex = trimmedChunk.IndexOf('=');
            var cookieName = separatorIndex == -1 ? trimmedChunk : trimmedChunk[..separatorIndex];

            if (!string.Equals(cookieName, AdminSessionContract.CookieName, StringComparison.Ordinal))
            {
                continue;
            }

            var encodedCookieValue = separatorIndex == -1 ? string.Empty : trimmedChunk[(separatorIndex + 1)..];
            return Uri.UnescapeDataString(encodedCookieValue);
        }

        return null;
    }

    private static byte[] Base64UrlDecode(string value)
    {
        var paddedValue = value
            .Replace('-', '+')
            .Replace('_', '/');
        var paddingLength = (4 - paddedValue.Length % 4) % 4;
        paddedValue = paddedValue.PadRight(paddedValue.Length + paddingLength, '=');
        return Convert.FromBase64String(paddedValue);
    }
}
