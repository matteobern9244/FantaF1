using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;
using FantaF1.Infrastructure.Authentication;
using Microsoft.Extensions.Configuration;

namespace FantaF1.Tests.Unit;

public sealed class AdminSessionCookieInspectorTests
{
    [Fact]
    public void Constructor_rejects_null_dependencies()
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var signedCookieService = new StubSignedCookieService();

        Assert.Throws<ArgumentNullException>(() => new AdminSessionCookieInspector(null!, signedCookieService));
        Assert.Throws<ArgumentNullException>(() => new AdminSessionCookieInspector(clock, null!));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("theme=dark")]
    [InlineData("theme=dark; fantaf1_admin_session")]
    public void Has_active_admin_session_returns_false_for_missing_blank_or_unrelated_cookie_headers(string? cookieHeader)
    {
        var inspector = CreateInspector(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));

        Assert.False(inspector.HasActiveAdminSession(cookieHeader));
    }

    [Fact]
    public void Has_active_admin_session_rejects_unverified_or_malformed_signed_payloads()
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var inspector = new AdminSessionCookieInspector(clock, new StubSignedCookieService(false, null));

        Assert.False(inspector.HasActiveAdminSession($"{AdminSessionContract.CookieName}=signed"));

        var verifiedInspector = new AdminSessionCookieInspector(clock, new StubSignedCookieService(true, "not-base64"));
        Assert.False(verifiedInspector.HasActiveAdminSession($"{AdminSessionContract.CookieName}=signed"));
    }

    [Fact]
    public void Has_active_admin_session_accepts_valid_admin_cookies_and_handles_missing_issued_at()
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var inspector = CreateInspector(clock);

        var validCookie = CreateCookieHeader(CreateSignedPayload(clock.UtcNow, AdminSessionContract.AdminRole));
        var missingIssuedAtCookie = CreateCookieHeader(CreateSignedPayload("""{"role":"admin"}"""));
        var invalidIssuedAtCookie = CreateCookieHeader(CreateSignedPayload("""{"role":"admin","issuedAt":"not-a-number"}"""));
        var wrongRoleCookie = CreateCookieHeader(CreateSignedPayload(clock.UtcNow, "viewer"));
        var expiredCookie = CreateCookieHeader(CreateSignedPayload(clock.UtcNow - AdminSessionContract.SessionTtl - TimeSpan.FromMinutes(1), AdminSessionContract.AdminRole));
        var emptySignedValueInspector = new AdminSessionCookieInspector(clock, new StubSignedCookieService(true, string.Empty));

        Assert.True(inspector.HasActiveAdminSession(validCookie));
        Assert.True(inspector.HasActiveAdminSession(missingIssuedAtCookie));
        Assert.True(inspector.HasActiveAdminSession(invalidIssuedAtCookie));
        Assert.False(inspector.HasActiveAdminSession(wrongRoleCookie));
        Assert.False(inspector.HasActiveAdminSession(expiredCookie));
        Assert.False(emptySignedValueInspector.HasActiveAdminSession($"{AdminSessionContract.CookieName}=signed"));
    }

    private static AdminSessionCookieInspector CreateInspector(StubClock clock)
    {
        return new AdminSessionCookieInspector(clock, CreateSignedCookieService());
    }

    private static HmacSignedCookieService CreateSignedCookieService()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [AdminSessionContract.SessionSecretEnvironmentVariableName] = "test-admin-secret",
            })
            .Build();

        return new HmacSignedCookieService(configuration);
    }

    private static string CreateCookieHeader(string signedValue)
    {
        return $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(signedValue)}";
    }

    private static string CreateSignedPayload(DateTimeOffset issuedAt, string role)
    {
        var payload = JsonSerializer.Serialize(new
        {
            role,
            nonce = "0123456789abcdef",
            issuedAt = issuedAt.ToUnixTimeMilliseconds(),
        });

        return CreateSignedPayload(payload);
    }

    private static string CreateSignedPayload(string rawJsonPayload)
    {
        var unsignedPayload = Convert.ToBase64String(Encoding.UTF8.GetBytes(rawJsonPayload))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

        return CreateSignedCookieService().Sign(unsignedPayload);
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class StubSignedCookieService : ISignedCookieService
    {
        private readonly bool _verifyResult;
        private readonly string? _unsignedValue;

        public StubSignedCookieService(bool verifyResult = true, string? unsignedValue = null)
        {
            _verifyResult = verifyResult;
            _unsignedValue = unsignedValue;
        }

        public string Sign(string value)
        {
            return value;
        }

        public bool TryVerify(string signedValue, out string? unsignedValue)
        {
            unsignedValue = _unsignedValue ?? signedValue;
            return _verifyResult;
        }
    }
}
