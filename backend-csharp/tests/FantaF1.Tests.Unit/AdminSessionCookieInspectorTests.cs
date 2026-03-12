using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;

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
        public string Sign(string value)
        {
            return value;
        }

        public bool TryVerify(string signedValue, out string? unsignedValue)
        {
            unsignedValue = signedValue;
            return true;
        }
    }
}
