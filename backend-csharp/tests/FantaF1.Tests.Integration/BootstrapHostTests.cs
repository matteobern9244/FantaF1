using FantaF1.Api.Controllers;
using FantaF1.Api.DependencyInjection;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.Controllers;
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
            PortingBootstrapController.ReadyMessage,
            await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public void Host_exposes_only_the_root_controller_action_and_resolves_the_required_subphase_two_contracts()
    {
        using var factory = _factory;
        using var scope = factory.Services.CreateScope();
        var serviceProvider = scope.ServiceProvider;

        Assert.NotNull(serviceProvider.GetRequiredService<IAdminCredentialRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAdminSessionService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAppDataRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IBackgroundSyncService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IClock>());
        Assert.NotNull(serviceProvider.GetRequiredService<IDriverRepository>());
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

        Assert.Equal(2, controllerEndpoints.Length);
        Assert.Contains(controllerEndpoints, endpoint => endpoint.Route.Length == 0);
        Assert.Contains(controllerEndpoints, endpoint => string.Equals(endpoint.Route, "api/health", StringComparison.Ordinal));
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
}
