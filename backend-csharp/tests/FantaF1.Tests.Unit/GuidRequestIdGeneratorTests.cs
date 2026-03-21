using FantaF1.Infrastructure.Configuration;

namespace FantaF1.Tests.Unit;

public sealed class GuidRequestIdGeneratorTests
{
    [Fact]
    public void Generate_returns_a_non_empty_guid_string()
    {
        var generator = new GuidRequestIdGenerator();

        var requestId = generator.Generate();
        var anotherRequestId = generator.Generate();

        Assert.True(Guid.TryParse(requestId, out _));
        Assert.True(Guid.TryParse(anotherRequestId, out _));
        Assert.NotEqual(requestId, anotherRequestId);
    }
}
