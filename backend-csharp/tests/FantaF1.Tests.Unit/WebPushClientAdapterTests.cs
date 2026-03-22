using FantaF1.Infrastructure.Push;
using WebPush;

namespace FantaF1.Tests.Unit;

public sealed class WebPushClientAdapterTests
{
    [Fact]
    public void Constructor_rejects_a_null_client()
    {
        Assert.Throws<ArgumentNullException>(() => new WebPushClientAdapter(null!));
    }

    [Fact]
    public async Task Send_notification_async_forwards_the_call_to_the_underlying_client()
    {
        var adapter = new WebPushClientAdapter(new WebPushClient());
        var vapidDetails = new VapidDetails(
            "mailto:test@example.com",
            "BFJTlviLmgXKsr9puZrgDimJlMXczPxopfFIVkXcO5wTJaKc2qoaD6ObQY6ZaU95RVm5oPXFG1B2uNJYr-12EZM",
            "_YhPsmWH8dY_-WlHXbr9RavXBmUj97sYewQe5YDD2v4");
        var subscription = new PushSubscription(
            "https://example.com/push",
            "BFeWPLF_WzV1tlaEm_EmgN8qt245k8DxguHg1aG-6redFVkj0viqHVReoVsNNBn74xQF6Hg6DjagGHQN-h1khY4",
            "zDGkKH-FaL46BYBL7FU5Mg");

        var exception = await Record.ExceptionAsync(() => adapter.SendNotificationAsync(
            subscription,
            "{\"test\":true}",
            vapidDetails,
            CancellationToken.None));

        Assert.NotNull(exception);
        Assert.DoesNotContain("Invalid point encoding", exception.ToString());
    }
}
