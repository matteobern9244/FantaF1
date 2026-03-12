using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;

namespace FantaF1.Application.Services;

public sealed class AdminSessionService : IAdminSessionService
{
    private readonly IAdminCredentialRepository _adminCredentialRepository;
    private readonly IClock _clock;
    private readonly IRuntimeEnvironmentProfileResolver _runtimeEnvironmentProfileResolver;
    private readonly ISignedCookieService _signedCookieService;

    public AdminSessionService(
        IClock clock,
        IRuntimeEnvironmentProfileResolver runtimeEnvironmentProfileResolver,
        IAdminCredentialRepository adminCredentialRepository,
        ISignedCookieService signedCookieService)
    {
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _runtimeEnvironmentProfileResolver = runtimeEnvironmentProfileResolver
            ?? throw new ArgumentNullException(nameof(runtimeEnvironmentProfileResolver));
        _adminCredentialRepository = adminCredentialRepository
            ?? throw new ArgumentNullException(nameof(adminCredentialRepository));
        _signedCookieService = signedCookieService ?? throw new ArgumentNullException(nameof(signedCookieService));
    }

    public async Task<AdminSessionResponse> GetSessionAsync(string? cookieHeader, CancellationToken cancellationToken)
    {
        await _adminCredentialRepository.EnsureDefaultCredentialAsync(cancellationToken);

        var environment = _runtimeEnvironmentProfileResolver.ResolveCurrentProfile().Environment;
        var isAdmin = string.Equals(environment, AdminSessionContract.DevelopmentEnvironment, StringComparison.Ordinal)
            || TryReadAdminSession(cookieHeader);

        return BuildResponse(environment, isAdmin);
    }

    public async Task<AdminSessionLoginResult> LoginAsync(string? password, CancellationToken cancellationToken)
    {
        await _adminCredentialRepository.EnsureDefaultCredentialAsync(cancellationToken);

        var environment = _runtimeEnvironmentProfileResolver.ResolveCurrentProfile().Environment;
        var normalizedPassword = password ?? string.Empty;
        var isPasswordValid = await _adminCredentialRepository.VerifyPasswordAsync(
            normalizedPassword,
            cancellationToken);

        if (!isPasswordValid)
        {
            return new AdminSessionLoginResult(
                false,
                BuildResponse(environment, isAdmin: false),
                SetCookieHeaderValue: null);
        }

        return new AdminSessionLoginResult(
            true,
            BuildResponse(environment, isAdmin: true),
            BuildSessionCookie(environment));
    }

    public AdminSessionCommandResult Logout()
    {
        var environment = _runtimeEnvironmentProfileResolver.ResolveCurrentProfile().Environment;

        return new AdminSessionCommandResult(
            BuildResponse(environment, isAdmin: false),
            BuildClearCookie(environment));
    }

    private AdminSessionResponse BuildResponse(string environment, bool isAdmin)
    {
        return new AdminSessionResponse(isAdmin, AdminSessionContract.ResolveDefaultViewMode(environment));
    }

    private bool TryReadAdminSession(string? cookieHeader)
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

    private string BuildSessionCookie(string environment)
    {
        var secureFlag = AdminSessionContract.IsProductionLikeEnvironment(environment) ? "; Secure" : string.Empty;
        return $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(BuildSignedSessionCookieValue())}{AdminSessionContract.CookieAttributes}{secureFlag}";
    }

    private string BuildClearCookie(string environment)
    {
        var secureFlag = AdminSessionContract.IsProductionLikeEnvironment(environment) ? "; Secure" : string.Empty;
        return $"{AdminSessionContract.CookieName}={string.Empty}{AdminSessionContract.CookieAttributes}; Max-Age=0{secureFlag}";
    }

    private string BuildSignedSessionCookieValue()
    {
        var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(new SessionPayload(
            AdminSessionContract.AdminRole,
            GenerateNonce(),
            _clock.UtcNow.ToUnixTimeMilliseconds()), SessionPayloadJsonOptions);
        var unsignedPayload = Base64UrlEncode(payloadBytes);

        return _signedCookieService.Sign(unsignedPayload);
    }

    private static string GenerateNonce()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLowerInvariant();
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

    private static string Base64UrlEncode(byte[] value)
    {
        return Convert.ToBase64String(value)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
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

    private sealed record SessionPayload(
        string Role,
        string Nonce,
        long IssuedAt);

    private static readonly JsonSerializerOptions SessionPayloadJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
}
