using FantaF1.Api.Controllers;
using FantaF1.Api.DependencyInjection;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
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
        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.ToString());
        Assert.Equal(
            PortingBootstrapController.ReadyMessage,
            await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public void Host_exposes_the_subphase_four_controller_actions_and_resolves_the_required_contracts()
    {
        using var factory = CreateFactory();
        using var scope = factory.Services.CreateScope();
        var serviceProvider = scope.ServiceProvider;

        Assert.NotNull(serviceProvider.GetRequiredService<IAdminCredentialRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAdminSessionService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAppDataRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAppDataReadService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IBackgroundSyncService>());
        Assert.NotNull(serviceProvider.GetRequiredService<ICalendarReadService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IClock>());
        Assert.NotNull(serviceProvider.GetRequiredService<IDriverRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IDriverReadService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IHealthReportService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IResultsService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IRuntimeEnvironmentProfileResolver>());
        Assert.NotNull(serviceProvider.GetRequiredService<ISaveRequestService>());
        Assert.NotNull(serviceProvider.GetRequiredService<ISignedCookieService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IWeekendRepository>());

        var controllerEndpoints = factory.Services
            .GetServices<EndpointDataSource>()
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => new
            {
                Route = endpoint.RoutePattern.RawText ?? string.Empty,
                Action = endpoint.Metadata.GetMetadata<ControllerActionDescriptor>(),
            })
            .Where(endpoint => endpoint.Action is not null)
            .ToArray();

        Assert.Equal(10, controllerEndpoints.Length);
        Assert.Contains(controllerEndpoints, endpoint => endpoint.Route.Length == 0);
        Assert.Equal(
            2,
            controllerEndpoints.Count(endpoint => string.Equals(endpoint.Route, "api/data", StringComparison.Ordinal)));
        Assert.Contains(controllerEndpoints, endpoint => string.Equals(endpoint.Route, "api/predictions", StringComparison.Ordinal));
        Assert.Contains(controllerEndpoints, endpoint => string.Equals(endpoint.Route, "api/drivers", StringComparison.Ordinal));
        Assert.Contains(controllerEndpoints, endpoint => string.Equals(endpoint.Route, "api/calendar", StringComparison.Ordinal));
        Assert.Contains(controllerEndpoints, endpoint => string.Equals(endpoint.Route, "api/health", StringComparison.Ordinal));
        Assert.Contains(controllerEndpoints, endpoint => string.Equals(endpoint.Route, "api/session", StringComparison.Ordinal));
        Assert.Equal(
            2,
            controllerEndpoints.Count(endpoint => string.Equals(endpoint.Route, "api/admin/session", StringComparison.Ordinal)));
    }

    [Fact]
    public void Api_registration_rejects_a_null_service_collection()
    {
        Assert.Throws<ArgumentNullException>(() => ApiServiceCollectionExtensions.AddFantaF1Api(null!));
    }

    [Fact]
    public void Bootstrap_endpoint_registration_rejects_a_null_route_builder()
    {
        Assert.Throws<ArgumentNullException>(() => PortingBootstrapController.ValidateRouteBuilder(null!));
    }

    [Fact]
    public void Bootstrap_endpoint_registration_returns_the_same_route_builder_instance_when_valid()
    {
        IEndpointRouteBuilder routeBuilder = new TestEndpointRouteBuilder();

        var result = PortingBootstrapController.ValidateRouteBuilder(routeBuilder);

        Assert.Same(routeBuilder, result);
    }

    private sealed class TestEndpointRouteBuilder : IEndpointRouteBuilder
    {
        public ICollection<EndpointDataSource> DataSources { get; } = [];

        public IServiceProvider ServiceProvider { get; } = new ServiceCollection().BuildServiceProvider();

        public IApplicationBuilder CreateApplicationBuilder()
        {
            return new ApplicationBuilder(ServiceProvider);
        }
    }

    private WebApplicationFactory<Program> CreateFactory()
    {
        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
            {
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_porting?retryWrites=true&w=majority",
                    ["ADMIN_SESSION_SECRET"] = "integration-admin-secret",
                });
            });
        });
    }
}
