using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Infrastructure.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace FantaF1.Tests.Integration;

public sealed class SessionEndpointTests
{
    [Fact]
    public void Session_controller_requires_a_session_service_dependency()
    {
        var exception = Assert.Throws<ArgumentNullException>(() => new SessionController(null!));

        Assert.Equal("adminSessionService", exception.ParamName);
    }

    [Fact]
    public async Task Development_session_endpoint_returns_the_admin_default_view()
    {
        await using var factory = CreateFactory("Development");
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<Dictionary<string, object>>("/api/session");

        Assert.NotNull(payload);
        Assert.Equal("True", payload["isAdmin"]?.ToString());
        Assert.Equal("admin", payload["defaultViewMode"]?.ToString());
    }

    [Fact]
    public async Task Production_session_endpoint_returns_the_public_default_view_without_a_cookie()
    {
        await using var factory = CreateFactory("Production");
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<Dictionary<string, object>>("/api/session");

        Assert.NotNull(payload);
        Assert.Equal("False", payload["isAdmin"]?.ToString());
        Assert.Equal("public", payload["defaultViewMode"]?.ToString());
    }

    [Fact]
    public async Task Development_login_rejects_a_missing_password_property_with_a_node_compatible_401()
    {
        await using var factory = CreateFactory("Development");
        using var client = factory.CreateClient();

        var response = await client.PostAsync(
            "/api/admin/session",
            new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.NotNull(payload);
        Assert.Equal(AdminSessionContract.InvalidPasswordError, payload["error"]?.ToString());
        Assert.Equal(AdminSessionContract.InvalidPasswordCode, payload["code"]?.ToString());
    }

    [Fact]
    public async Task Development_login_rejects_a_scalar_json_body_with_a_node_compatible_401()
    {
        await using var factory = CreateFactory("Development");
        using var client = factory.CreateClient();

        var response = await client.PostAsync(
            "/api/admin/session",
            new StringContent("\"invalid\"", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.NotNull(payload);
        Assert.Equal(AdminSessionContract.InvalidPasswordError, payload["error"]?.ToString());
        Assert.Equal(AdminSessionContract.InvalidPasswordCode, payload["code"]?.ToString());
    }

    [Fact]
    public async Task Development_login_returns_a_cookie_without_the_secure_flag()
    {
        var password = CreatePassword("subphase-4-development-login");
        await using var factory = CreateFactory("Development", CreateAdminCredentialSeedConfiguration(password, "subphase-4-development-salt"));
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/admin/session", new { password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            ["fantaf1_admin_session"],
            response.Headers.GetValues("Set-Cookie")
                .Select(header => header.Split('=', 2, StringSplitOptions.None)[0])
                .ToArray());

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.NotNull(payload);
        Assert.Equal("True", payload["isAdmin"]?.ToString());
        Assert.Equal("admin", payload["defaultViewMode"]?.ToString());

        var setCookie = response.Headers.GetValues("Set-Cookie").Single();
        Assert.Contains("; Path=/; HttpOnly; SameSite=Lax", setCookie, StringComparison.Ordinal);
        Assert.DoesNotContain("; Secure", setCookie, StringComparison.Ordinal);
        Assert.DoesNotContain("Max-Age=0", setCookie, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Production_login_returns_a_secure_cookie_and_supports_a_session_roundtrip()
    {
        var password = CreatePassword("subphase-4-production-login");
        await using var factory = CreateFactory("Production", CreateAdminCredentialSeedConfiguration(password, "subphase-4-production-salt"));
        using var client = factory.CreateClient();

        var loginResponse = await client.PostAsJsonAsync("/api/admin/session", new { password });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var setCookie = loginResponse.Headers.GetValues("Set-Cookie").Single();
        Assert.Contains("; Secure", setCookie, StringComparison.Ordinal);

        using var sessionRequest = new HttpRequestMessage(HttpMethod.Get, "/api/session");
        sessionRequest.Headers.Add("Cookie", setCookie.Split(';', 2, StringSplitOptions.None)[0]);

        var sessionResponse = await client.SendAsync(sessionRequest);
        var payload = await sessionResponse.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.OK, sessionResponse.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal("True", payload["isAdmin"]?.ToString());
        Assert.Equal("public", payload["defaultViewMode"]?.ToString());
    }

    [Fact]
    public async Task Production_logout_returns_the_public_default_view_and_a_clearing_secure_cookie()
    {
        await using var factory = CreateFactory("Production");
        using var client = factory.CreateClient();

        var response = await client.DeleteAsync("/api/admin/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.NotNull(payload);
        Assert.Equal("False", payload["isAdmin"]?.ToString());
        Assert.Equal("public", payload["defaultViewMode"]?.ToString());

        var setCookie = response.Headers.GetValues("Set-Cookie").Single();

        Assert.Contains("fantaf1_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0", setCookie, StringComparison.Ordinal);
        Assert.Contains("; Secure", setCookie, StringComparison.Ordinal);
    }

    private static WebApplicationFactory<Program> CreateFactory(
        string environmentName,
        IReadOnlyDictionary<string, string?>? configurationValues = null)
    {
        return new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment(environmentName);
                builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                {
                    configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        [AdminSessionContract.SessionSecretEnvironmentVariableName] = "integration-admin-secret",
                        ["Bootstrap:DisableHostedService"] = "true",
                    });

                    if (configurationValues is not null)
                    {
                        configurationBuilder.AddInMemoryCollection(configurationValues);
                    }
                });
            });
    }

    private static Dictionary<string, string?> CreateAdminCredentialSeedConfiguration(string password, string saltSeedLabel)
    {
        var salt = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(saltSeedLabel)))
            .ToLowerInvariant()[..32];
        var hasher = new NodeCompatibleScryptPasswordHasher();

        return new Dictionary<string, string?>
        {
            [ContractAdminCredentialSeedOptions.PasswordHashHexConfigurationPath] = hasher.HashPassword(password, salt),
            [ContractAdminCredentialSeedOptions.PasswordSaltConfigurationPath] = salt,
        };
    }

    private static string CreatePassword(string seedLabel)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(seedLabel))).ToLowerInvariant();
    }
}
