using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Tests.Unit;

public sealed class PushSubscriptionSupportTypesTests
{
    [Fact]
    public void Push_subscription_document_uses_endpoint_as_identifier()
    {
        var subscription = new PushSubscriptionDocument("https://example.com/push", "p256dh", "auth", 123.45);

        Assert.Equal("https://example.com/push", subscription.Id);
    }

    [Fact]
    public void Push_subscription_not_found_exception_exposes_the_endpoint_and_message()
    {
        var exception = new PushSubscriptionNotFoundException("https://example.com/push");

        Assert.Equal("https://example.com/push", exception.Endpoint);
        Assert.Contains("https://example.com/push", exception.Message);
    }
}
