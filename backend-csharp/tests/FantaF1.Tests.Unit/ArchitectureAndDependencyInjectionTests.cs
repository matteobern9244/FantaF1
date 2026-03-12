using FantaF1.Application;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.DependencyInjection;
using FantaF1.Application.Services;
using FantaF1.Domain;
using FantaF1.Infrastructure.Authentication;
using FantaF1.Infrastructure;
using FantaF1.Infrastructure.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
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
    public void Application_and_infrastructure_registrations_resolve_all_subphase_four_contracts()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_porting?retryWrites=true&w=majority",
            })
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment("Development"));
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
        Assert.NotNull(serviceProvider.GetRequiredService<IAppDataReadService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IBackgroundSyncService>());
        Assert.NotNull(serviceProvider.GetRequiredService<ICalendarReadService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IDriverRepository>());
        Assert.NotNull(serviceProvider.GetRequiredService<IDriverReadService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IHealthReportService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IRequestIdGenerator>());
        Assert.NotNull(serviceProvider.GetRequiredService<IResultsService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IRuntimeEnvironmentProfileResolver>());
        Assert.NotNull(serviceProvider.GetRequiredService<ISaveRequestService>());
        Assert.NotNull(serviceProvider.GetRequiredService<IWeekendRepository>());

        var clock = serviceProvider.GetRequiredService<IClock>();
        Assert.NotEqual(default, clock.UtcNow);

        var signedCookieService = serviceProvider.GetRequiredService<ISignedCookieService>();
        var signedValue = signedCookieService.Sign("bootstrap-cookie");
        var verified = signedCookieService.TryVerify(signedValue, out var unsignedValue);

        Assert.True(verified);
        Assert.Equal("bootstrap-cookie", unsignedValue);

        Assert.IsType<AdminSessionService>(serviceProvider.GetRequiredService<IAdminSessionService>());
        Assert.IsType<ContractAdminCredentialRepository>(serviceProvider.GetRequiredService<IAdminCredentialRepository>());
        Assert.IsType<SaveRequestService>(serviceProvider.GetRequiredService<ISaveRequestService>());
        Assert.NotNull(serviceProvider.GetRequiredService<NodeCompatibleScryptPasswordHasher>());
        Assert.IsType<HmacSignedCookieService>(signedCookieService);
    }

    [Fact]
    public void Application_registration_rejects_a_null_service_collection()
    {
        Assert.Throws<ArgumentNullException>(() => ApplicationServiceCollectionExtensions.AddFantaF1Application(null!));
    }

    [Fact]
    public void Infrastructure_registration_uses_the_configured_hash_only_admin_credential_seed()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [ContractAdminCredentialSeedOptions.PasswordHashHexConfigurationPath] = "ab".PadRight(128, 'c'),
                [ContractAdminCredentialSeedOptions.PasswordSaltConfigurationPath] = "configured-salt",
                ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_porting?retryWrites=true&w=majority",
            })
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment("Development"));
        services.AddFantaF1Infrastructure();

        using var provider = services.BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateOnBuild = true,
            ValidateScopes = true,
        });

        var options = provider.GetRequiredService<IOptions<ContractAdminCredentialSeedOptions>>().Value;

        Assert.Equal("ab".PadRight(128, 'c'), options.PasswordHashHex);
        Assert.Equal("configured-salt", options.PasswordSalt);
    }

    [Fact]
    public void Infrastructure_registration_rejects_a_null_service_collection()
    {
        Assert.Throws<ArgumentNullException>(() => InfrastructureServiceCollectionExtensions.AddFantaF1Infrastructure(null!));
    }

    [Fact]
    public void Infrastructure_registration_requires_mongodb_uri_when_the_mongo_client_is_resolved()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment("Development"));
        services.AddFantaF1Application();
        services.AddFantaF1Infrastructure();

        using var provider = services.BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateOnBuild = true,
            ValidateScopes = true,
        });

        var exception = Assert.Throws<InvalidOperationException>(() => provider.GetRequiredService<IMongoClient>());

        Assert.Equal("MONGODB_URI environment variable is not defined", exception.Message);
    }

    private static HashSet<string> GetReferenceNames(Assembly assembly)
    {
        return assembly.GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public TestHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }

        public string ApplicationName { get; set; } = "FantaF1.Tests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
