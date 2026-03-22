using System.Net;
using System.Net.Http.Json;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FantaF1.Tests.Integration;

public sealed class PushSubscriptionsEndpointTests
{
    [Fact]
    public async Task Push_subscription_routes_are_wired_to_the_http_pipeline()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IPushSubscriptionService>();
            services.AddSingleton<IPushSubscriptionService>(new StubPushSubscriptionService());
        });

        using var client = factory.CreateClient();

        var postResponse = await client.PostAsJsonAsync("/api/push-subscriptions", new
        {
            endpoint = "https://example.com/push",
            expirationTime = 123.45,
            auth = "auth",
            p256dh = "p256dh",
        });
        var deleteResponse = await client.DeleteAsync("/api/push-subscriptions?endpoint=https%3A%2F%2Fexample.com%2Fpush");

        Assert.Equal(HttpStatusCode.NoContent, postResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    private static WebApplicationFactory<Program> CreateFactory(Action<IServiceCollection> configureServices)
    {
        return new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Development");
                builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                {
                    configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority",
                        [AdminSessionContract.SessionSecretEnvironmentVariableName] = "integration-admin-secret",
                        ["Bootstrap:DisableHostedService"] = "true",
                    });
                });
                builder.ConfigureServices(configureServices);
            });
    }

    private sealed class StubPushSubscriptionService : IPushSubscriptionService
    {
        public Task SubscribeAsync(PushSubscriptionDocument subscription, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task UnsubscribeAsync(string endpoint, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
