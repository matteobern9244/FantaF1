using FantaF1.Api.DependencyInjection;
using FantaF1.Api.Endpoints;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using System.Net;

namespace FantaF1.Tests.Integration;

public sealed class BootstrapHostTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public BootstrapHostTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Root_endpoint_returns_the_bootstrap_ready_message()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.ToString());
        Assert.Equal(
            PortingBootstrapEndpointRouteBuilderExtensions.ReadyMessage,
            await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public void Host_exposes_only_the_bootstrap_route_and_resolves_the_required_contracts()
    {
        using var scope = _factory.Services.CreateScope();
        var serviceProvider = scope.ServiceProvider;

        Assert.NotNull(serviceProvider.GetRequiredService<IAdminCredentialRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAdminSessionService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAppDataRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IBackgroundSyncService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IClock>());
        Assert.NotNull(serviceProvider.GetRequiredService<IDriverRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IResultsService>());
        Assert.NotNull(serviceProvider.GetRequiredService<ISaveRequestService>());
        Assert.NotNull(serviceProvider.GetRequiredService<ISignedCookieService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IWeekendRepository>());

        var routePatterns = _factory.Services
            .GetServices<EndpointDataSource>()
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText)
            .OfType<string>()
            .ToArray();

        Assert.Contains("/", routePatterns);
        Assert.DoesNotContain(routePatterns, route => route.StartsWith("/api/", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Api_registration_rejects_a_null_service_collection()
    {
        Assert.Throws<ArgumentNullException>(() => ApiServiceCollectionExtensions.AddFantaF1Api(null!));
    }

    [Fact]
    public void Bootstrap_endpoint_registration_rejects_a_null_route_builder()
    {
        Assert.Throws<ArgumentNullException>(() => PortingBootstrapEndpointRouteBuilderExtensions.MapPortingBootstrapEndpoints(null!));
    }
}
