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
    private readonly AdminSessionCookieInspector _adminSessionCookieInspector;

    public AdminSessionService(
        IClock clock,
        IRuntimeEnvironmentProfileResolver runtimeEnvironmentProfileResolver,
        IAdminCredentialRepository adminCredentialRepository,
        ISignedCookieService signedCookieService,
        AdminSessionCookieInspector adminSessionCookieInspector)
    {
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _runtimeEnvironmentProfileResolver = runtimeEnvironmentProfileResolver
            ?? throw new ArgumentNullException(nameof(runtimeEnvironmentProfileResolver));
        _adminCredentialRepository = adminCredentialRepository
            ?? throw new ArgumentNullException(nameof(adminCredentialRepository));
        _signedCookieService = signedCookieService ?? throw new ArgumentNullException(nameof(signedCookieService));
        _adminSessionCookieInspector = adminSessionCookieInspector ?? throw new ArgumentNullException(nameof(adminSessionCookieInspector));
    }

    public async Task<AdminSessionResponse> GetSessionAsync(string? cookieHeader, CancellationToken cancellationToken)
    {
        await _adminCredentialRepository.EnsureDefaultCredentialAsync(cancellationToken);

        var environment = _runtimeEnvironmentProfileResolver.ResolveCurrentProfile().Environment;
        var isAdmin = string.Equals(environment, AdminSessionContract.DevelopmentEnvironment, StringComparison.Ordinal)
            || _adminSessionCookieInspector.HasActiveAdminSession(cookieHeader);

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

    private static string Base64UrlEncode(byte[] value)
    {
        return Convert.ToBase64String(value)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
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
