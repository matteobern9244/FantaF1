using System.Net;
using System.Net.Http.Json;
using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FantaF1.Tests.Integration;

public sealed class PushNotificationsEndpointTests
{
    [Fact]
    public async Task Push_notifications_endpoints_are_wired_to_the_http_pipeline()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IPushNotificationService>();
            services.AddSingleton<IPushNotificationService>(new StubPushNotificationService());
        });

        using var client = factory.CreateClient();

        var configResponse = await client.GetAsync("/api/push-notifications/config");
        var deliveryResponse = await client.PostAsJsonAsync(
            "/api/push-notifications/test-delivery",
            new PushTestDeliveryRequest("https://example.com/push"));

        Assert.Equal(HttpStatusCode.OK, configResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, deliveryResponse.StatusCode);
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
                        ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_staging?retryWrites=true&w=majority",
                        [AdminSessionContract.SessionSecretEnvironmentVariableName] = "integration-admin-secret",
                        ["Bootstrap:DisableHostedService"] = "true",
                    });
                });
                builder.ConfigureServices(services =>
                {
                    configureServices(services);
                });
            });
    }

    private sealed class StubPushNotificationService : IPushNotificationService
    {
        public PushNotificationClientConfiguration GetClientConfiguration() => new(true, "public-key");

        public Task SendTestNotificationAsync(string endpoint, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
