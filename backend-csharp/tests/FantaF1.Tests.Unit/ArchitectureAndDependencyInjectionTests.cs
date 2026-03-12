using FantaF1.Application;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.DependencyInjection;
using FantaF1.Domain;
using FantaF1.Infrastructure;
using FantaF1.Infrastructure.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace FantaF1.Tests.Unit;

public sealed class ArchitectureAndDependencyInjectionTests
{
    [Fact]
    public void Layer_references_follow_the_expected_direction()
    {
        var domainReferences = GetReferenceNames(typeof(DomainAssemblyMarker).Assembly);
        var applicationReferences = GetReferenceNames(typeof(ApplicationAssemblyMarker).Assembly);
        var infrastructureReferences = GetReferenceNames(typeof(InfrastructureAssemblyMarker).Assembly);

        Assert.Equal("FantaF1.Domain", ApplicationAssemblyMarker.DomainDependencyMarker.Assembly.GetName().Name);
        Assert.Equal("FantaF1.Application", InfrastructureAssemblyMarker.ApplicationDependencyMarker.Assembly.GetName().Name);
        Assert.Equal("FantaF1.Domain", InfrastructureAssemblyMarker.DomainDependencyMarker.Assembly.GetName().Name);

        Assert.DoesNotContain("FantaF1.Application", domainReferences);
        Assert.DoesNotContain("FantaF1.Infrastructure", domainReferences);
        Assert.Contains("FantaF1.Domain", applicationReferences);
        Assert.DoesNotContain("FantaF1.Infrastructure", applicationReferences);
        Assert.Contains("FantaF1.Application", infrastructureReferences);
        Assert.Contains("FantaF1.Domain", infrastructureReferences);
    }

    [Fact]
    public void Application_and_infrastructure_registrations_resolve_all_subphase_two_contracts()
    {
        var services = new ServiceCollection();

        services.AddFantaF1Application();
        services.AddFantaF1Infrastructure();

        using var provider = services.BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateOnBuild = true,
            ValidateScopes = true,
        });
        using var scope = provider.CreateScope();
        var serviceProvider = scope.ServiceProvider;

        Assert.NotNull(serviceProvider.GetRequiredService<IAdminCredentialRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAdminSessionService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IAppDataRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IBackgroundSyncService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IDriverRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IResultsService>());
        Assert.NotNull(serviceProvider.GetRequiredService<ISaveRequestService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IWeekendRepository>());

        var clock = serviceProvider.GetRequiredService<IClock>();
        Assert.NotEqual(default, clock.UtcNow);

        var signedCookieService = serviceProvider.GetRequiredService<ISignedCookieService>();
        var signException = Assert.Throws<NotSupportedException>(() => signedCookieService.Sign("bootstrap-cookie"));
        var verifyException = Assert.Throws<NotSupportedException>(() => signedCookieService.TryVerify("bootstrap-cookie", out _));

        Assert.Contains("Subphase 4", signException.Message, StringComparison.Ordinal);
        Assert.Contains("Subphase 4", verifyException.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Application_registration_rejects_a_null_service_collection()
    {
        Assert.Throws<ArgumentNullException>(() => ApplicationServiceCollectionExtensions.AddFantaF1Application(null!));
    }

    [Fact]
    public void Infrastructure_registration_rejects_a_null_service_collection()
    {
        Assert.Throws<ArgumentNullException>(() => InfrastructureServiceCollectionExtensions.AddFantaF1Infrastructure(null!));
    }

    private static HashSet<string> GetReferenceNames(Assembly assembly)
    {
        return assembly.GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);
    }
}
