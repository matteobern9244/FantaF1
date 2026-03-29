using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;
using FantaF1.Infrastructure.Authentication;
using Microsoft.Extensions.Configuration;

namespace FantaF1.Tests.Unit;

public sealed class AdminSessionServiceTests
{
    [Fact]
    public void Admin_session_service_rejects_null_dependencies()
    {
        var repository = new SpyAdminCredentialRepository();
        var resolver = new StubRuntimeEnvironmentProfileResolver("development");
        var signedCookieService = CreateSignedCookieService();
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var cookieInspector = new AdminSessionCookieInspector(clock, signedCookieService);

        Assert.Throws<ArgumentNullException>(() => new AdminSessionService(null!, resolver, repository, signedCookieService, cookieInspector));
        Assert.Throws<ArgumentNullException>(() => new AdminSessionService(clock, null!, repository, signedCookieService, cookieInspector));
        Assert.Throws<ArgumentNullException>(() => new AdminSessionService(clock, resolver, null!, signedCookieService, cookieInspector));
        Assert.Throws<ArgumentNullException>(() => new AdminSessionService(clock, resolver, repository, null!, cookieInspector));
        Assert.Throws<ArgumentNullException>(() => new AdminSessionService(clock, resolver, repository, signedCookieService, null!));
    }

    [Fact]
    public async Task Get_session_async_returns_admin_defaults_in_development_and_ensures_credentials()
    {
        var repository = new SpyAdminCredentialRepository();
        var service = CreateService("development", repository);

        var response = await service.GetSessionAsync(cookieHeader: null, CancellationToken.None);

        Assert.True(response.IsAdmin);
        Assert.Equal(AdminSessionContract.DevelopmentDefaultViewMode, response.DefaultViewMode);
        Assert.Equal(1, repository.EnsureDefaultCredentialCallCount);
        Assert.Equal(0, repository.VerifyPasswordCallCount);
    }

    [Fact]
    public async Task Get_session_async_returns_public_defaults_in_production_like_environments_without_a_cookie()
    {
        var repository = new SpyAdminCredentialRepository();
        var service = CreateService("production", repository);

        var response = await service.GetSessionAsync(cookieHeader: "theme=dark", CancellationToken.None);

        Assert.False(response.IsAdmin);
        Assert.Equal(AdminSessionContract.ProductionLikeDefaultViewMode, response.DefaultViewMode);
        Assert.Equal(1, repository.EnsureDefaultCredentialCallCount);
    }

    [Fact]
    public async Task Get_session_async_accepts_a_valid_signed_admin_cookie()
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var service = CreateService("production", new SpyAdminCredentialRepository(), clock);
        var cookieHeader = $"theme=dark; {AdminSessionContract.CookieName}={Uri.EscapeDataString(CreateSignedPayload(clock.UtcNow, role: AdminSessionContract.AdminRole))}";

        var response = await service.GetSessionAsync(cookieHeader, CancellationToken.None);

        Assert.True(response.IsAdmin);
        Assert.Equal(AdminSessionContract.ProductionLikeDefaultViewMode, response.DefaultViewMode);
    }

    [Theory]
    [MemberData(nameof(InvalidCookieHeaders))]
    public async Task Get_session_async_rejects_invalid_cookies(string cookieHeader)
    {
        var service = CreateService("production", new SpyAdminCredentialRepository());

        var response = await service.GetSessionAsync(cookieHeader, CancellationToken.None);

        Assert.False(response.IsAdmin);
        Assert.Equal(AdminSessionContract.ProductionLikeDefaultViewMode, response.DefaultViewMode);
    }

    [Fact]
    public async Task Get_session_async_accepts_a_cookie_exactly_at_the_ttl_boundary()
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var issuedAt = clock.UtcNow - AdminSessionContract.SessionTtl;
        var service = CreateService("production", new SpyAdminCredentialRepository(), clock);
        var cookieHeader = $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(CreateSignedPayload(issuedAt, role: AdminSessionContract.AdminRole))}";

        var response = await service.GetSessionAsync(cookieHeader, CancellationToken.None);

        Assert.True(response.IsAdmin);
        Assert.Equal(AdminSessionContract.ProductionLikeDefaultViewMode, response.DefaultViewMode);
    }

    [Theory]
    [InlineData("{\"role\":\"admin\",\"nonce\":\"0123456789abcdef\"}")]
    [InlineData("{\"role\":\"admin\",\"nonce\":\"0123456789abcdef\",\"issuedAt\":\"not-a-number\"}")]
    public async Task Get_session_async_treats_missing_or_non_numeric_issued_at_as_not_expired(string rawJsonPayload)
    {
        var service = CreateService("production", new SpyAdminCredentialRepository());
        var cookieHeader = $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(CreateSignedPayload(rawJsonPayload))}";

        var response = await service.GetSessionAsync(cookieHeader, CancellationToken.None);

        Assert.True(response.IsAdmin);
        Assert.Equal(AdminSessionContract.ProductionLikeDefaultViewMode, response.DefaultViewMode);
    }

    [Fact]
    public async Task Login_async_normalizes_missing_password_and_returns_an_unauthorized_result()
    {
        var repository = new SpyAdminCredentialRepository
        {
            VerifyPasswordResult = false,
        };
        var service = CreateService("development", repository);

        var result = await service.LoginAsync(password: null, CancellationToken.None);

        Assert.False(result.IsAuthenticated);
        Assert.Null(result.SetCookieHeaderValue);
        Assert.False(result.Response.IsAdmin);
        Assert.Equal(AdminSessionContract.DevelopmentDefaultViewMode, result.Response.DefaultViewMode);
        Assert.Equal(1, repository.EnsureDefaultCredentialCallCount);
        Assert.Equal(1, repository.VerifyPasswordCallCount);
        Assert.Equal(string.Empty, repository.Passwords.Single());
    }

    [Theory]
    [InlineData("development", false)]
    [InlineData("production", true)]
    public async Task Login_async_builds_a_wire_compatible_cookie_for_each_environment(string environment, bool expectsSecureFlag)
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var repository = new SpyAdminCredentialRepository
        {
            VerifyPasswordResult = true,
        };
        var service = CreateService(environment, repository, clock);
        var password = CreatePassword($"subphase-4-login-{environment}");

        var result = await service.LoginAsync(password, CancellationToken.None);

        Assert.True(result.IsAuthenticated);
        Assert.True(result.Response.IsAdmin);
        Assert.Equal(
            environment == "development"
                ? AdminSessionContract.DevelopmentDefaultViewMode
                : AdminSessionContract.ProductionLikeDefaultViewMode,
            result.Response.DefaultViewMode);
        Assert.NotNull(result.SetCookieHeaderValue);
        Assert.StartsWith($"{AdminSessionContract.CookieName}=", result.SetCookieHeaderValue, StringComparison.Ordinal);
        Assert.Contains("; Path=/; HttpOnly; SameSite=Lax", result.SetCookieHeaderValue, StringComparison.Ordinal);
        Assert.Equal(expectsSecureFlag, result.SetCookieHeaderValue.Contains("; Secure", StringComparison.Ordinal));
        Assert.DoesNotContain("Max-Age=0", result.SetCookieHeaderValue, StringComparison.Ordinal);
        Assert.Equal(password, repository.Passwords.Single());

        var payload = ExtractSignedPayload(result.SetCookieHeaderValue, CreateSignedCookieService());

        Assert.Equal(AdminSessionContract.AdminRole, payload.RootElement.GetProperty("role").GetString());
        Assert.Equal(clock.UtcNow.ToUnixTimeMilliseconds(), payload.RootElement.GetProperty("issuedAt").GetInt64());
        Assert.Matches("^[0-9a-f]{16}$", payload.RootElement.GetProperty("nonce").GetString());
    }

    [Theory]
    [InlineData("development", false, "admin")]
    [InlineData("production", true, "public")]
    public void Logout_builds_the_clear_cookie_with_the_expected_environment_flags(
        string environment,
        bool expectsSecureFlag,
        string expectedDefaultViewMode)
    {
        var service = CreateService(environment, new SpyAdminCredentialRepository());

        var result = service.Logout();

        Assert.False(result.Response.IsAdmin);
        Assert.Equal(expectedDefaultViewMode, result.Response.DefaultViewMode);
        Assert.Equal(
            expectsSecureFlag,
            result.SetCookieHeaderValue.Contains("; Secure", StringComparison.Ordinal));
        Assert.Contains(
            $"{AdminSessionContract.CookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            result.SetCookieHeaderValue,
            StringComparison.Ordinal);
    }

    public static TheoryData<string> InvalidCookieHeaders()
    {
        var now = new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero);
        var signedCookieService = CreateSignedCookieService();
        var viewerPayload = CreateSignedPayload(now, role: "viewer");
        var expiredPayload = CreateSignedPayload(now - AdminSessionContract.SessionTtl - TimeSpan.FromMinutes(1), role: AdminSessionContract.AdminRole);

        return new TheoryData<string>
        {
            "   ",
            $"lonely; {AdminSessionContract.CookieName}",
            $"{AdminSessionContract.CookieName}=missing-separator",
            $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(CreateSignedPayload(now, role: AdminSessionContract.AdminRole) + ".tampered")}",
            $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(CreateSignedPayload("{not-json"))}",
            $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(signedCookieService.Sign("***"))}",
            $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(viewerPayload)}",
            $"{AdminSessionContract.CookieName}={Uri.EscapeDataString(expiredPayload)}",
        };
    }

    private static AdminSessionService CreateService(
        string environment,
        SpyAdminCredentialRepository repository,
        StubClock? clock = null)
    {
        return new AdminSessionService(
            clock ?? new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)),
            new StubRuntimeEnvironmentProfileResolver(environment),
            repository,
            CreateSignedCookieService(),
            new AdminSessionCookieInspector(
                clock ?? new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)),
                CreateSignedCookieService()));
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

    private static JsonDocument ExtractSignedPayload(string setCookieHeaderValue, ISignedCookieService signedCookieService)
    {
        var encodedValue = setCookieHeaderValue.Split(';', 2, StringSplitOptions.None)[0]
            .Split('=', 2, StringSplitOptions.None)[1];
        var rawValue = Uri.UnescapeDataString(encodedValue);
        var verified = signedCookieService.TryVerify(rawValue, out var unsignedPayload);

        Assert.True(verified);
        Assert.NotNull(unsignedPayload);

        return JsonDocument.Parse(Base64UrlDecode(unsignedPayload));
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

    private static string CreatePassword(string seedLabel)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(seedLabel))).ToLowerInvariant();
    }

    private sealed class SpyAdminCredentialRepository : IAdminCredentialRepository
    {
        public int EnsureDefaultCredentialCallCount { get; private set; }

        public int VerifyPasswordCallCount { get; private set; }

        public bool VerifyPasswordResult { get; set; }

        public List<string> Passwords { get; } = [];

        public Task EnsureDefaultCredentialAsync(CancellationToken cancellationToken)
        {
            EnsureDefaultCredentialCallCount++;
            return Task.CompletedTask;
        }

        public Task<bool> VerifyPasswordAsync(string password, CancellationToken cancellationToken)
        {
            VerifyPasswordCallCount++;
            Passwords.Add(password);
            return Task.FromResult(VerifyPasswordResult);
        }
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class StubRuntimeEnvironmentProfileResolver : IRuntimeEnvironmentProfileResolver
    {
        private readonly RuntimeEnvironmentProfile _profile;

        public StubRuntimeEnvironmentProfileResolver(string environment)
        {
            _profile = new RuntimeEnvironmentProfile(environment, "fantaf1_porting");
        }

        public RuntimeEnvironmentProfile ResolveCurrentProfile()
        {
            return _profile;
        }
    }
}
