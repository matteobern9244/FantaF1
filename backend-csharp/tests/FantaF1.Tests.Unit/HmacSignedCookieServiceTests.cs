using FantaF1.Application.Abstractions.Services;
using FantaF1.Infrastructure.Authentication;
using Microsoft.Extensions.Configuration;

namespace FantaF1.Tests.Unit;

public sealed class HmacSignedCookieServiceTests
{
    [Fact]
    public void Hmac_signed_cookie_service_rejects_a_null_configuration()
    {
        Assert.Throws<ArgumentNullException>(() => new HmacSignedCookieService(null!));
    }

    [Fact]
    public void Sign_and_try_verify_roundtrip_with_a_configured_secret()
    {
        var service = CreateService("test-admin-secret");

        var signedValue = service.Sign("payload");
        var verified = service.TryVerify(signedValue, out var unsignedValue);

        Assert.True(verified);
        Assert.Equal("payload", unsignedValue);
    }

    [Fact]
    public void Sign_uses_the_default_secret_when_the_configuration_is_missing()
    {
        var service = CreateService(secret: null);

        var signedValue = service.Sign("payload");
        var verified = service.TryVerify(signedValue, out var unsignedValue);

        Assert.True(verified);
        Assert.Equal("payload", unsignedValue);
    }

    [Fact]
    public void Try_verify_returns_false_for_missing_separator_or_tampered_signature()
    {
        var service = CreateService("test-admin-secret");
        var signedValue = service.Sign("payload");

        Assert.False(service.TryVerify(string.Empty, out _));
        Assert.False(service.TryVerify("payload", out _));
        Assert.False(service.TryVerify($"{signedValue}tampered", out _));
    }

    [Fact]
    public void Sign_rejects_a_null_unsigned_value()
    {
        var service = CreateService("test-admin-secret");

        Assert.Throws<ArgumentNullException>(() => service.Sign(null!));
    }

    private static HmacSignedCookieService CreateService(string? secret)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(secret is null
                ? []
                : new Dictionary<string, string?>
                {
                    [AdminSessionContract.SessionSecretEnvironmentVariableName] = secret,
                })
            .Build();

        return new HmacSignedCookieService(configuration);
    }
}
