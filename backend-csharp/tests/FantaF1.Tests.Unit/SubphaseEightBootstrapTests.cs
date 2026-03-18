using System.Net;
using System.Reflection;
using System.Text;
using FantaF1.Api.Hosting;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Authentication;
using FantaF1.Infrastructure.Bootstrap;
using FantaF1.Infrastructure.Calendar;
using FantaF1.Infrastructure.Configuration;
using FantaF1.Infrastructure.Drivers;
using FantaF1.Infrastructure.Mongo;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace FantaF1.Tests.Unit;

public sealed class SubphaseEightBootstrapTests
{
    [Theory]
    [InlineData("scopeFactory")]
    [InlineData("applicationLifetime")]
    [InlineData("logger")]
    public void Porting_bootstrap_hosted_service_constructor_rejects_null_dependencies(string parameterName)
    {
        var services = new ServiceCollection().BuildServiceProvider();
        var scopeFactory = services.GetRequiredService<IServiceScopeFactory>();
        var lifetime = new StubHostApplicationLifetime();
        var logger = NullLogger<PortingBootstrapHostedService>.Instance;

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "scopeFactory" => new PortingBootstrapHostedService(null!, lifetime, logger),
            "applicationLifetime" => new PortingBootstrapHostedService(scopeFactory, null!, logger),
            "logger" => new PortingBootstrapHostedService(scopeFactory, lifetime, null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Background_sync_service_runs_all_sync_paths_and_swallow_individual_failures()
    {
        var driverSync = new OfficialDriverSyncService(
            CreatePortingAppConfig(expectedDrivers: 1, expectedWeekends: 1),
            new SpyDriverRepository(),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://stats.example/2026.aspx"] = "__throw__",
                ["https://formula1.example/en/drivers"] = string.Empty,
            }));
        var calendarSync = new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 1, expectedWeekends: 1),
            new SpyWeekendRepository(),
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://formula1.example/en/racing/2026"] = "__throw__",
            }));
        var standingsSync = new StubStandingsSyncService(exception: new InvalidOperationException("standings"));
        var service = new BackgroundSyncService(driverSync, calendarSync, standingsSync, NullLogger<BackgroundSyncService>.Instance);

        await service.RunAsync(CancellationToken.None);

        Assert.Equal(1, standingsSync.Calls);
    }

    [Fact]
    public async Task Background_sync_service_supports_success_and_constructor_guards()
    {
        var driverSync = new OfficialDriverSyncService(
            CreatePortingAppConfig(expectedDrivers: 1, expectedWeekends: 1),
            new SpyDriverRepository(),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://stats.example/2026.aspx"] = """
                    <tr><td>1</td><td><span class="CurDriver">Max Verstappen</span></td><td>Red Bull</td></tr>
                """,
                ["https://formula1.example/en/drivers"] = string.Empty,
            }));
        var calendarSync = new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 1, expectedWeekends: 1),
            new SpyWeekendRepository(),
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://formula1.example/en/racing/2026"] = """
                    <a href="/en/racing/2026/monaco"><span>ROUND 1</span><span>23 - 25 MAY</span><span>Monaco</span></a>
                """,
                ["https://www.formula1.com/en/racing/2026/monaco"] = "<title>Monaco GP - F1 Race</title>",
            }));
        var standingsSync = new StubStandingsSyncService();
        var service = new BackgroundSyncService(driverSync, calendarSync, standingsSync, NullLogger<BackgroundSyncService>.Instance);

        await service.RunAsync(CancellationToken.None);

        Assert.Equal(1, standingsSync.Calls);

        Assert.Equal("driverSyncService", Assert.Throws<ArgumentNullException>(() => new BackgroundSyncService(null!, calendarSync, standingsSync, NullLogger<BackgroundSyncService>.Instance)).ParamName);
        Assert.Equal("calendarSyncService", Assert.Throws<ArgumentNullException>(() => new BackgroundSyncService(driverSync, null!, standingsSync, NullLogger<BackgroundSyncService>.Instance)).ParamName);
        Assert.Equal("standingsSyncService", Assert.Throws<ArgumentNullException>(() => new BackgroundSyncService(driverSync, calendarSync, null!, NullLogger<BackgroundSyncService>.Instance)).ParamName);
        Assert.Equal("logger", Assert.Throws<ArgumentNullException>(() => new BackgroundSyncService(driverSync, calendarSync, standingsSync, null!)).ParamName);

        var throwingDriverService = new OfficialDriverSyncService(
            CreatePortingAppConfig(expectedDrivers: 3, expectedWeekends: 1),
            new ThrowingDriverRepository(),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://stats.example/2026.aspx"] = "__throw__",
                ["https://formula1.example/en/drivers"] = string.Empty,
            }));
        var throwingCalendarService = new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 1, expectedWeekends: 1),
            new ThrowingWeekendRepository(),
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://formula1.example/en/racing/2026"] = "__throw__",
            }));
        var throwingService = new BackgroundSyncService(throwingDriverService, throwingCalendarService, standingsSync, NullLogger<BackgroundSyncService>.Instance);

        await throwingService.RunAsync(CancellationToken.None);

        Assert.Equal(2, standingsSync.Calls);
    }

    [Fact]
    public async Task Porting_bootstrap_hosted_service_runs_blocking_bootstrap_then_background_sync_after_startup()
    {
        var environmentResolver = new StubRuntimeEnvironmentProfileResolver(new("development", "fantaf1_porting"));
        var repository = new SpyAdminCredentialRepository();
        var backgroundSyncService = new SpyBackgroundSyncService();
        var applicationLifetime = new StubHostApplicationLifetime();
        var services = new ServiceCollection();
        services.AddSingleton<IRuntimeEnvironmentProfileResolver>(environmentResolver);
        services.AddScoped<IAdminCredentialRepository>(_ => repository);
        services.AddScoped<IBackgroundSyncService>(_ => backgroundSyncService);
        await using var provider = services.BuildServiceProvider().CreateAsyncScope();
        var hostedService = new PortingBootstrapHostedService(
            provider.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
            applicationLifetime,
            NullLogger<PortingBootstrapHostedService>.Instance);

        await hostedService.StartAsync(CancellationToken.None);
        Assert.True(repository.EnsureCalled);
        Assert.False(backgroundSyncService.RunCalled);

        applicationLifetime.RaiseStarted();
        await Task.Delay(50);

        Assert.True(backgroundSyncService.RunCalled);
    }

    [Fact]
    public async Task Porting_bootstrap_hosted_service_swallows_background_sync_failures_and_stop_is_a_no_op()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IRuntimeEnvironmentProfileResolver>(new StubRuntimeEnvironmentProfileResolver(new("development", "fantaf1_porting")));
        services.AddScoped<IAdminCredentialRepository>(_ => new SpyAdminCredentialRepository());
        services.AddScoped<IBackgroundSyncService>(_ => new ThrowingBackgroundSyncService());
        await using var provider = services.BuildServiceProvider().CreateAsyncScope();
        var applicationLifetime = new StubHostApplicationLifetime();
        var hostedService = new PortingBootstrapHostedService(
            provider.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
            applicationLifetime,
            NullLogger<PortingBootstrapHostedService>.Instance);

        await hostedService.StartAsync(CancellationToken.None);
        applicationLifetime.RaiseStarted();
        await Task.Delay(50);

        await hostedService.StopAsync(CancellationToken.None);
    }

    [Theory]
    [InlineData("seedOptions")]
    [InlineData("passwordHasher")]
    [InlineData("database")]
    public void Contract_admin_credential_repository_constructor_rejects_null_dependencies(string parameterName)
    {
        var options = Options.Create(new ContractAdminCredentialSeedOptions
        {
            PasswordSalt = "subphase8salt0000000000000000000"[..32],
            PasswordHashHex = "hash",
        });
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var database = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>()).Database;

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "seedOptions" => new ContractAdminCredentialRepository(null!, hasher, database),
            "passwordHasher" => new ContractAdminCredentialRepository(options, null!, database),
            "database" => new ContractAdminCredentialRepository(options, hasher, null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Contract_admin_credential_repository_persists_the_default_seed_and_verifies_against_mongo()
    {
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var password = CreatePassword("subphase-8-admin-password");
        var salt = "subphase8salt0000000000000000000"[..32];
        var harness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AdminCredentials] = [],
        });
        var repository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hasher.HashPassword(password, salt),
            }),
            hasher,
            harness.Database);

        await repository.EnsureDefaultCredentialAsync(CancellationToken.None);

        Assert.NotNull(harness.InsertedDocuments.SingleOrDefault());
        Assert.True(await repository.VerifyPasswordAsync(password, CancellationToken.None));
        Assert.False(await repository.VerifyPasswordAsync("wrong-password", CancellationToken.None));
    }

    [Fact]
    public async Task Contract_admin_credential_repository_supports_seed_only_existing_and_invalid_mongo_paths()
    {
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var password = CreatePassword("subphase-8-admin-password");
        var salt = "subphase8salt0000000000000000000"[..32];
        var hash = hasher.HashPassword(password, salt);

        var seedOnlyRepository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hash,
            }),
            hasher);

        await seedOnlyRepository.EnsureDefaultCredentialAsync(CancellationToken.None);
        Assert.True(await seedOnlyRepository.VerifyPasswordAsync(password, CancellationToken.None));
        Assert.False(await seedOnlyRepository.VerifyPasswordAsync("bad-password", CancellationToken.None));

        var existingHarness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AdminCredentials] =
            [
                new BsonDocument
                {
                    ["role"] = "admin",
                    ["passwordHash"] = hash,
                    ["passwordSalt"] = salt,
                },
            ],
        });
        var existingRepository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hash,
            }),
            hasher,
            existingHarness.Database);

        await existingRepository.EnsureDefaultCredentialAsync(CancellationToken.None);
        Assert.Empty(existingHarness.InsertedDocuments);

        var missingCredentialHarness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AdminCredentials] = [],
        });
        var missingCredentialRepository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hash,
            }),
            hasher,
            missingCredentialHarness.Database);

        Assert.False(await missingCredentialRepository.VerifyPasswordAsync(password, CancellationToken.None));

        var invalidCredentialHarness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AdminCredentials] =
            [
                new BsonDocument
                {
                    ["role"] = "admin",
                    ["passwordHash"] = "",
                    ["passwordSalt"] = "",
                },
            ],
        });
        var invalidCredentialRepository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hash,
            }),
            hasher,
            invalidCredentialHarness.Database);

        Assert.False(await invalidCredentialRepository.VerifyPasswordAsync(password, CancellationToken.None));
    }

    [Fact]
    public async Task Contract_admin_credential_repository_handles_missing_and_non_string_mongo_fields()
    {
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var password = CreatePassword("subphase-8-admin-password");
        var salt = "subphase8salt0000000000000000000"[..32];
        var hash = hasher.HashPassword(password, salt);

        var missingSaltHarness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AdminCredentials] =
            [
                new BsonDocument
                {
                    ["role"] = "admin",
                    ["passwordHash"] = hash,
                },
            ],
        });
        var missingSaltRepository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hash,
            }),
            hasher,
            missingSaltHarness.Database);
        Assert.False(await missingSaltRepository.VerifyPasswordAsync(password, CancellationToken.None));

        var nonStringHarness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.AdminCredentials] =
            [
                new BsonDocument
                {
                    ["role"] = "admin",
                    ["passwordHash"] = 42,
                    ["passwordSalt"] = 42,
                },
            ],
        });
        var nonStringRepository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hash,
            }),
            hasher,
            nonStringHarness.Database);
        Assert.False(await nonStringRepository.VerifyPasswordAsync(password, CancellationToken.None));
    }

    [Fact]
    public async Task Contract_admin_credential_repository_swallows_duplicate_key_when_bootstrapping()
    {
        var hasher = new NodeCompatibleScryptPasswordHasher();
        var password = CreatePassword("subphase-8-admin-password");
        var salt = "subphase8salt0000000000000000000"[..32];
        var harness = CreateMongoDatabase(
            new Dictionary<string, IReadOnlyList<BsonDocument>>
            {
                [MongoCollectionNames.AdminCredentials] = [],
            },
            insertBehaviorByCollection: new Dictionary<string, Func<BsonDocument, Exception?>>
            {
                [MongoCollectionNames.AdminCredentials] = _ => CreateDuplicateKeyWriteException(),
            });
        var repository = new ContractAdminCredentialRepository(
            Options.Create(new ContractAdminCredentialSeedOptions
            {
                PasswordSalt = salt,
                PasswordHashHex = hasher.HashPassword(password, salt),
            }),
            hasher,
            harness.Database);

        await repository.EnsureDefaultCredentialAsync(CancellationToken.None);
    }

    [Theory]
    [InlineData("database")]
    [InlineData("mapper")]
    [InlineData("writeMapper")]
    public void Mongo_driver_repository_constructor_rejects_null_dependencies(string parameterName)
    {
        var harness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>());

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "database" => new MongoDriverRepository(null!, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper()),
            "mapper" => new MongoDriverRepository(harness.Database, null!, new MongoLegacyWriteDocumentMapper()),
            "writeMapper" => new MongoDriverRepository(harness.Database, new MongoLegacyReadDocumentMapper(), null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Mongo_driver_repository_replaces_the_cached_driver_collection()
    {
        var harness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Drivers] = [],
        });
        var repository = new MongoDriverRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper());

        await repository.WriteAllAsync(
            [
                new DriverDocument("alb", "Alexander Albon", "Williams", "#005AFF", "https://example.com/alb.webp", "williams"),
            ],
            CancellationToken.None);

        Assert.True(harness.DeleteManyCalled);
        Assert.Single(harness.InsertedDocuments);
        Assert.Equal("alb", harness.InsertedDocuments[0]["id"].AsString);
    }

    [Fact]
    public async Task Mongo_driver_repository_supports_empty_write_batches()
    {
        var harness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Drivers] = [],
        });
        var repository = new MongoDriverRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper());

        await repository.WriteAllAsync([], CancellationToken.None);

        Assert.True(harness.DeleteManyCalled);
        Assert.Empty(harness.InsertedDocuments);
    }

    [Theory]
    [InlineData("database")]
    [InlineData("mapper")]
    [InlineData("writeMapper")]
    public void Mongo_weekend_repository_constructor_rejects_null_dependencies(string parameterName)
    {
        var harness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>());

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "database" => new MongoWeekendRepository(null!, new MongoLegacyReadDocumentMapper(), new MongoLegacyWriteDocumentMapper()),
            "mapper" => new MongoWeekendRepository(harness.Database, null!, new MongoLegacyWriteDocumentMapper()),
            "writeMapper" => new MongoWeekendRepository(harness.Database, new MongoLegacyReadDocumentMapper(), null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Mongo_weekend_repository_replaces_the_cached_calendar_collection()
    {
        var harness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] = [],
        });
        var repository = new MongoWeekendRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper());

        await repository.WriteAllAsync(
            [
                new WeekendDocument(
                    "1280",
                    "China",
                    "FORMULA 1 CHINESE GRAND PRIX 2026",
                    2,
                    "20 - 22 MAR",
                    "https://www.formula1.com/en/racing/2026/china",
                    "hero.webp",
                    "track.webp",
                    true,
                    "2026-03-20",
                    "2026-03-22",
                    "2026-03-22T07:00:00Z",
                    [new WeekendSessionDocument("Race", "2026-03-22T07:00:00Z")],
                    "https://youtube.com/watch?v=sky",
                    "2026-03-22T10:00:00.000Z",
                    "found",
                    "feed"),
            ],
            CancellationToken.None);

        Assert.True(harness.DeleteManyCalled);
        Assert.Single(harness.InsertedDocuments);
        Assert.Equal("1280", harness.InsertedDocuments[0]["meetingKey"].AsString);
        Assert.True(harness.InsertedDocuments[0]["isSprintWeekend"].AsBoolean);
    }

    [Fact]
    public async Task Mongo_weekend_repository_supports_empty_write_batches()
    {
        var harness = CreateMongoDatabase(new Dictionary<string, IReadOnlyList<BsonDocument>>
        {
            [MongoCollectionNames.Weekends] = [],
        });
        var repository = new MongoWeekendRepository(
            harness.Database,
            new MongoLegacyReadDocumentMapper(),
            new MongoLegacyWriteDocumentMapper());

        await repository.WriteAllAsync([], CancellationToken.None);

        Assert.True(harness.DeleteManyCalled);
        Assert.Empty(harness.InsertedDocuments);
    }

    [Theory]
    [InlineData("configuration")]
    [InlineData("hostEnvironment")]
    [InlineData("clock")]
    public void Porting_app_config_loader_constructor_rejects_null_dependencies(string parameterName)
    {
        var configuration = new ConfigurationBuilder().Build();
        var environment = new StubHostEnvironment(Path.GetTempPath());
        var clock = new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero));

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "configuration" => new PortingAppConfigLoader(null!, environment, clock),
            "hostEnvironment" => new PortingAppConfigLoader(configuration, null!, clock),
            "clock" => new PortingAppConfigLoader(configuration, environment, null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public void Porting_app_config_loader_reads_official_source_config_and_prefers_the_configured_frontend_build_path()
    {
        var temporaryRoot = Path.Combine(Path.GetTempPath(), $"fantaf1-subphase8-{Guid.NewGuid():N}");
        Directory.CreateDirectory(temporaryRoot);
        Directory.CreateDirectory(Path.Combine(temporaryRoot, "config"));
        File.WriteAllText(Path.Combine(temporaryRoot, "AGENTS.md"), "test", Encoding.UTF8);
        File.WriteAllText(
            Path.Combine(temporaryRoot, "config", "app-config.json"),
            File.ReadAllText(GetRepositoryPath("config", "app-config.json"), Encoding.UTF8),
            Encoding.UTF8);

        var loader = new PortingAppConfigLoader(
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    [PortingFrontendOptions.BuildPathConfigurationKey] = "custom-dist",
                })
                .Build(),
            new StubHostEnvironment(temporaryRoot),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)));

        var config = loader.Load();

        Assert.Equal(2026, config.CurrentYear);
        Assert.Contains("/2026.aspx", config.Drivers.StatsUrl, StringComparison.Ordinal);
        Assert.Contains("/2026", config.Calendar.SeasonUrl, StringComparison.Ordinal);
        Assert.Equal(Path.Combine(temporaryRoot, "custom-dist"), loader.ResolveFrontendBuildPath());
    }

    [Fact]
    public void Porting_app_config_loader_uses_default_dist_and_empty_maps_when_optional_config_is_missing()
    {
        var temporaryRoot = Path.Combine(Path.GetTempPath(), $"fantaf1-subphase8-config-{Guid.NewGuid():N}");
        Directory.CreateDirectory(temporaryRoot);
        Directory.CreateDirectory(Path.Combine(temporaryRoot, "config"));
        File.WriteAllText(Path.Combine(temporaryRoot, "AGENTS.md"), "test", Encoding.UTF8);
        File.WriteAllText(
            Path.Combine(temporaryRoot, "config", "app-config.json"),
            """
            {
              "driversSource": {
                "statsBaseUrl": "https://stats.example",
                "formulaOneDriversUrl": "https://formula1.example/drivers",
                "sortLocale": null,
                "expectedCount": 20,
                "requestHeaders": {
                  "userAgent": null,
                  "acceptLanguage": null
                }
              },
              "calendarSource": {
                "baseUrl": "https://calendar.example",
                "expectedMinimumWeekends": 24
              }
            }
            """,
            Encoding.UTF8);

        var loader = new PortingAppConfigLoader(
            new ConfigurationBuilder().Build(),
            new StubHostEnvironment(temporaryRoot),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)));

        var config = loader.Load();

        Assert.Equal("it", config.Drivers.SortLocale);
        Assert.Empty(config.Drivers.DriverAliases);
        Assert.Empty(config.Drivers.TeamColors);
        Assert.Equal(Path.Combine(temporaryRoot, "dist"), loader.ResolveFrontendBuildPath());

        var nullStatsRoot = Path.Combine(Path.GetTempPath(), $"fantaf1-subphase8-nullstats-{Guid.NewGuid():N}");
        Directory.CreateDirectory(nullStatsRoot);
        Directory.CreateDirectory(Path.Combine(nullStatsRoot, "config"));
        File.WriteAllText(Path.Combine(nullStatsRoot, "AGENTS.md"), "test", Encoding.UTF8);
        File.WriteAllText(
            Path.Combine(nullStatsRoot, "config", "app-config.json"),
            """
            {
              "driversSource": {
                "statsBaseUrl": null,
                "formulaOneDriversUrl": "https://formula1.example/drivers",
                "sortLocale": "it",
                "expectedCount": 20,
                "requestHeaders": {
                  "userAgent": "ua",
                  "acceptLanguage": "it-IT"
                }
              },
              "calendarSource": {
                "baseUrl": "https://calendar.example",
                "expectedMinimumWeekends": 24
              }
            }
            """,
            Encoding.UTF8);
        var nullStatsLoader = new PortingAppConfigLoader(
            new ConfigurationBuilder().Build(),
            new StubHostEnvironment(nullStatsRoot),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)));

        Assert.Equal("/2026.aspx", nullStatsLoader.Load().Drivers.StatsUrl);
    }

    [Fact]
    public void Porting_app_config_loader_handles_null_optional_values_inside_maps()
    {
        var temporaryRoot = Path.Combine(Path.GetTempPath(), $"fantaf1-subphase8-maps-{Guid.NewGuid():N}");
        Directory.CreateDirectory(temporaryRoot);
        Directory.CreateDirectory(Path.Combine(temporaryRoot, "config"));
        File.WriteAllText(Path.Combine(temporaryRoot, "AGENTS.md"), "test", Encoding.UTF8);
        File.WriteAllText(
            Path.Combine(temporaryRoot, "config", "app-config.json"),
            """
            {
              "driversSource": {
                "statsBaseUrl": "https://stats.example/",
                "formulaOneDriversUrl": null,
                "sortLocale": null,
                "expectedCount": 20,
                "requestHeaders": {
                  "userAgent": null,
                  "acceptLanguage": null
                }
              },
              "calendarSource": {
                "baseUrl": null,
                "expectedMinimumWeekends": 24
              },
              "driverAliases": {
                "Ghost": null
              }
            }
            """,
            Encoding.UTF8);

        var loader = new PortingAppConfigLoader(
            new ConfigurationBuilder().Build(),
            new StubHostEnvironment(temporaryRoot),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)));

        var config = loader.Load();

        Assert.Equal("https://stats.example/2026.aspx", config.Drivers.StatsUrl);
        Assert.Equal(string.Empty, config.Drivers.FormulaOneDriversUrl);
        Assert.Equal("it", config.Drivers.SortLocale);
        Assert.Equal("/2026", config.Calendar.SeasonUrl);
        Assert.Equal(string.Empty, config.Drivers.DriverAliases["Ghost"]);
    }

    [Fact]
    public void Porting_app_config_loader_throws_when_repository_root_cannot_be_resolved()
    {
        var temporaryRoot = Path.Combine(Path.GetTempPath(), $"fantaf1-subphase8-missing-root-{Guid.NewGuid():N}");
        Directory.CreateDirectory(temporaryRoot);
        var loader = new PortingAppConfigLoader(
            new ConfigurationBuilder().Build(),
            new StubHostEnvironment(temporaryRoot),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)));

        Assert.Throws<DirectoryNotFoundException>(() => loader.ResolveFrontendBuildPath());
    }

    [Theory]
    [InlineData("config")]
    [InlineData("driverRepository")]
    [InlineData("httpClient")]
    public void Official_driver_sync_service_constructor_rejects_null_dependencies(string parameterName)
    {
        var config = CreatePortingAppConfig(expectedDrivers: 1, expectedWeekends: 1);
        var repository = new SpyDriverRepository();
        var httpClient = CreateHttpClient(new Dictionary<string, string>());

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "config" => new OfficialDriverSyncService(null!, repository, httpClient),
            "driverRepository" => new OfficialDriverSyncService(config, null!, httpClient),
            "httpClient" => new OfficialDriverSyncService(config, repository, null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Official_driver_sync_service_prefers_stats_source_and_writes_cache()
    {
        var repository = new SpyDriverRepository();
        var config = CreatePortingAppConfig(expectedDrivers: 3, expectedWeekends: 20);
        var service = new OfficialDriverSyncService(
            config,
            repository,
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Drivers.StatsUrl] = File.ReadAllText(GetRepositoryPath("tests", "fixtures", "statsf1-season.html"), Encoding.UTF8),
                [config.Drivers.FormulaOneDriversUrl] = """
                    <a href="/en/drivers/alexander-albon">
                      <img src="https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/williams/alealb01/2026williamsalealb01right.webp" />
                      <span class="typography-module_body-m-compact-regular__abc">Alexander</span>
                      <span class="typography-module_body-m-compact-bold__def uppercase">Albon</span>
                    </a>
                    <a href="/en/drivers/oliver-bearman">
                      <img src="https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/haas/olibea01/2026haasolibea01right.webp" />
                      <span class="typography-module_body-m-compact-regular__abc">Oliver</span>
                      <span class="typography-module_body-m-compact-bold__def uppercase">Bearman</span>
                    </a>
                """,
            }));

        var result = await service.SyncAsync(CancellationToken.None);

        Assert.Equal(3, result.Count);
        Assert.Equal(3, repository.WrittenDrivers.Count);
        Assert.Contains(result, driver => driver.Id == "alb" && driver.TeamSlug == "williams");
    }

    [Fact]
    public async Task Official_driver_sync_service_covers_formula_one_fetch_failure_and_insufficient_fallback_paths()
    {
        var config = CreatePortingAppConfig(expectedDrivers: 2, expectedWeekends: 20);
        var repository = new SpyDriverRepository
        {
            CachedDrivers =
            [
                new DriverDocument("bea", "Oliver Bearman", "Haas", "#FFFFFF", null, null),
                new DriverDocument("ver", "Max Verstappen", "Red Bull", "#0600EF", null, null),
            ],
        };
        var service = new OfficialDriverSyncService(
            config,
            repository,
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Drivers.StatsUrl] = """
                    <table id="ctl00_CPH_Main_GV_Entry"><tbody>
                      <tr>
                        <td>1</td>
                        <td><span class="CurDriver">Alex Albon</span></td>
                        <td>Williams</td>
                      </tr>
                    </tbody></table>
                """,
                [config.Drivers.FormulaOneDriversUrl] = "__throw__",
            }));

        var result = await service.SyncAsync(CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.Empty(repository.WrittenDrivers);

        var fallbackRepository = new SpyDriverRepository
        {
            CachedDrivers =
            [
                new DriverDocument("ver", "Max Verstappen", "Red Bull", "#0600EF", null, null),
            ],
        };
        var fallbackService = new OfficialDriverSyncService(
            CreatePortingAppConfig(expectedDrivers: 3, expectedWeekends: 20),
            fallbackRepository,
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://stats.example/2026.aspx"] = "__throw__",
                ["https://formula1.example/en/drivers"] = """
                    <a href="/en/drivers/alexander-albon">
                      <img src="https://media.formula1.com/image/upload/common/f1/2026/unknown/alealb01/right.webp" />
                      <span class="typography-module_body-m-compact-regular__abc">Alexander</span>
                      <span class="typography-module_body-m-compact-bold__def">Albon</span>
                    </a>
                """,
            }));

        var cachedResult = await fallbackService.SyncAsync(CancellationToken.None);

        Assert.Single(cachedResult);
        Assert.Equal("ver", cachedResult[0].Id);
    }

    [Fact]
    public async Task Official_driver_sync_service_falls_back_to_formula_one_page_then_cached_drivers()
    {
        var fallbackConfig = CreatePortingAppConfig(expectedDrivers: 2, expectedWeekends: 20);
        var fallbackRepository = new SpyDriverRepository();
        var fallbackService = new OfficialDriverSyncService(
            fallbackConfig,
            fallbackRepository,
            CreateHttpClient(new Dictionary<string, string>
            {
                [fallbackConfig.Drivers.StatsUrl] = "__throw__",
                [fallbackConfig.Drivers.FormulaOneDriversUrl] = @"
                    <a href=""/en/drivers/alexander-albon"">
                      <img src=""https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/williams/alealb01/2026williamsalealb01right.webp"" />
                      <span class=""typography-module_body-m-compact-regular__abc"">Alexander</span>
                      <span class=""typography-module_body-m-compact-bold__def uppercase"">Albon</span>
                    </a>
                    <a href=""/en/drivers/max-verstappen"">
                      <img src=""https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01right.webp"" />
                      <span class=""typography-module_body-m-compact-regular__abc"">Max</span>
                      <span class=""typography-module_body-m-compact-bold__def uppercase"">Verstappen</span>
                    </a>",
            }));

        var fallbackResult = await fallbackService.SyncAsync(CancellationToken.None);
        Assert.Equal(2, fallbackResult.Count);

        var cacheRepository = new SpyDriverRepository
        {
            CachedDrivers =
            [
                new DriverDocument("ver", "Max Verstappen", "Red Bull", "#0600EF", null, null),
            ],
        };
        var cacheConfig = CreatePortingAppConfig(expectedDrivers: 3, expectedWeekends: 20);
        var cacheService = new OfficialDriverSyncService(
            cacheConfig,
            cacheRepository,
            CreateHttpClient(new Dictionary<string, string>
            {
                [cacheConfig.Drivers.StatsUrl] = "__throw__",
                [cacheConfig.Drivers.FormulaOneDriversUrl] = string.Empty,
            }));

        var cachedResult = await cacheService.SyncAsync(CancellationToken.None);
        Assert.Single(cachedResult);
        Assert.Equal("ver", cachedResult[0].Id);
    }

    [Fact]
    public void Official_driver_sync_service_internal_helpers_cover_aliases_collisions_and_text_normalization()
    {
        var service = new OfficialDriverSyncService(
            CreatePortingAppConfig(expectedDrivers: 2, expectedWeekends: 1),
            new SpyDriverRepository(),
            CreateHttpClient(new Dictionary<string, string>()));

        Assert.Equal("Alexander Albon", service.CanonicalizeDriverName("alex albon"));
        Assert.Equal("No Alias", service.CanonicalizeDriverName("no alias"));
        Assert.Equal("Red Bull", service.CanonicalizeTeamName("Red Bull Racing"));
        Assert.Equal("Unknown Team", service.CanonicalizeTeamName("Unknown Team"));
        Assert.Equal("Williams", service.FindKnownTeam(["ignore", "Williams"]));
        Assert.Equal(string.Empty, service.FindKnownTeam(["ignore", "unknown"]));
        Assert.Equal("elo", OfficialDriverSyncService.GenerateFallbackId("Elo", []));
        Assert.Equal("el1", OfficialDriverSyncService.GenerateFallbackId("Elo", ["elo"]));
        Assert.Equal("ae  i  test", OfficialDriverSyncService.Slugify("Aé! I? Test"));
        Assert.Equal("Jean-Eric Vergne", OfficialDriverSyncService.ToNameCase("jean-eric VERGNE"));
        Assert.Equal("& \" ' '   e a", OfficialDriverSyncService.NormalizeText("&amp; &quot; &#39; &#x27; &nbsp; &egrave; &agrave;"));

        var parsedStats = service.ParseStatsSeasonDriversHtml(
            """
            <tr>
              <td>1</td>
              <td><span class="CurDriver">Alex Albon</span></td>
              <td>Williams</td>
            </tr>
            <tr>
              <td>2</td>
              <td><span class="CurDriver">Ghost Driver</span></td>
              <td>Unknown</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Williams</td>
            </tr>
            """).ToArray();
        Assert.Single(parsedStats);
        Assert.Equal(("Alexander Albon", "Williams"), parsedStats[0]);

        var parsedFormula = service.ParseFormulaOneDriversPage(
            """
            <a href="/en/drivers/alexander-albon">
              <img src="https://media.formula1.com/image/upload/common/f1/2026/williams/alealb01/right.webp" />
              <span class="typography-module_body-m-compact-regular__abc">Alexander</span>
              <span class="typography-module_body-m-compact-bold__def">Albon</span>
            </a>
            <a href="/en/drivers/ghost-driver">
              <img src="https://example.com/no-team.webp" />
              <span class="typography-module_body-m-compact-regular__abc">Ghost</span>
              <span class="typography-module_body-m-compact-bold__def">Driver</span>
            </a>
            """);
        Assert.Equal("williams", parsedFormula["Alexander Albon"].TeamSlug);
        Assert.Equal(string.Empty, parsedFormula["Ghost Driver"].TeamSlug);

        var built = service.BuildDriverRecord("Jean-Éric Vergne", "Unknown Team", ["ver"], null, null);
        Assert.Equal("ve1", built.Id);
        Assert.Equal("#5F6673", built.Color);
        Assert.Null(built.AvatarUrl);
        Assert.Null(built.TeamSlug);

        var fallbackDrivers = service.BuildFormulaOneFallbackDrivers(
            """
            <a href="/en/drivers/oliver-bearman">
              <img src="https://media.formula1.com/image/upload/common/f1/2026/haas/olibea01/right.webp" />
              <span class="typography-module_body-m-compact-regular__abc">Oliver</span>
              <span class="typography-module_body-m-compact-bold__def">Bearman</span>
            </a>
            <a href="/en/drivers/ghost-driver">
              <img src="https://example.com/no-team.webp" />
              <span class="typography-module_body-m-compact-regular__abc">Ghost</span>
              <span class="typography-module_body-m-compact-bold__def">Driver</span>
            </a>
            """);
        Assert.Single(fallbackDrivers);
        Assert.Equal("bea", fallbackDrivers[0].Id);
        Assert.Empty(service.ParseFormulaOneDriversPage(null!));
        Assert.Equal("xxx", OfficialDriverSyncService.GenerateFallbackId(string.Empty, []));
        Assert.Equal("alx", OfficialDriverSyncService.GenerateFallbackId("Al", []));
        Assert.Equal("Jean--Eric", OfficialDriverSyncService.ToNameCase("jean--ERIC"));
        Assert.Equal(string.Empty, OfficialDriverSyncService.NormalizeText(null!));
        Assert.Equal("&copy;", OfficialDriverSyncService.NormalizeText("&copy;\r\n"));
        var fullMediaDriver = service.BuildDriverRecord("Max Verstappen", "Red Bull", [], "avatar.webp", "redbullracing");
        Assert.Equal("avatar.webp", fullMediaDriver.AvatarUrl);
        Assert.Equal("redbullracing", fullMediaDriver.TeamSlug);
        var whitespaceMediaDriver = service.BuildDriverRecord("Ghost Driver", "Unknown Team", [], "", " ");
        Assert.Null(whitespaceMediaDriver.AvatarUrl);
        Assert.Null(whitespaceMediaDriver.TeamSlug);
        var noDefaultColorService = new OfficialDriverSyncService(
            CreatePortingAppConfig(expectedDrivers: 2, expectedWeekends: 1) with
            {
                Drivers = CreatePortingAppConfig(expectedDrivers: 2, expectedWeekends: 1).Drivers with
                {
                    TeamColors = new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["Red Bull"] = "#0600EF",
                    },
                },
            },
            new SpyDriverRepository(),
            CreateHttpClient(new Dictionary<string, string>()));
        Assert.Equal(string.Empty, noDefaultColorService.BuildDriverRecord("Ghost Driver", "Unknown Team", [], null, null).Color);
        Assert.Empty(service.ParseStatsSeasonDriversHtml(null!).ToArray());
        Assert.Equal("&AMP;", OfficialDriverSyncService.NormalizeText("&AMP;"));
    }

    [Theory]
    [InlineData("config")]
    [InlineData("weekendRepository")]
    [InlineData("highlightsLookupService")]
    [InlineData("clock")]
    [InlineData("httpClient")]
    public void Official_calendar_sync_service_constructor_rejects_null_dependencies(string parameterName)
    {
        var config = CreatePortingAppConfig(expectedDrivers: 1, expectedWeekends: 1);
        var repository = new SpyWeekendRepository();
        var highlights = new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", ""));
        var clock = new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero));
        var httpClient = CreateHttpClient(new Dictionary<string, string>());

        var exception = Assert.Throws<ArgumentNullException>(() => parameterName switch
        {
            "config" => new OfficialCalendarSyncService(null!, repository, highlights, clock, httpClient),
            "weekendRepository" => new OfficialCalendarSyncService(config, null!, highlights, clock, httpClient),
            "highlightsLookupService" => new OfficialCalendarSyncService(config, repository, null!, clock, httpClient),
            "clock" => new OfficialCalendarSyncService(config, repository, highlights, null!, httpClient),
            "httpClient" => new OfficialCalendarSyncService(config, repository, highlights, clock, null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        });

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Official_calendar_sync_service_parses_season_and_detail_fixtures_and_writes_cache()
    {
        var repository = new SpyWeekendRepository();
        var highlights = new StubHighlightsLookupService(
            shouldLookup: true,
            result: new HighlightsLookupDocument("https://www.youtube.com/watch?v=skyf1-finished", "2026-03-22T10:00:00.000Z", "found", "feed"));
        var config = CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 3);
        var seasonHtml = File.ReadAllText(GetRepositoryPath("tests", "fixtures", "formula1-season.html"), Encoding.UTF8);
        var detailHtml = File.ReadAllText(GetRepositoryPath("tests", "fixtures", "formula1-race-china.html"), Encoding.UTF8);
        var service = new OfficialCalendarSyncService(
            config,
            repository,
            highlights,
            new StubClock(new DateTimeOffset(2026, 03, 22, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Calendar.SeasonUrl] = seasonHtml,
                ["https://www.formula1.com/en/racing/2026/china"] = detailHtml,
                ["https://www.formula1.com/en/racing/2026/australia"] = "<title>Australia GP - F1 Race</title>",
                ["https://www.formula1.com/en/racing/2026/bahrain"] = "<title>Bahrain GP - F1 Race</title>",
            }));

        var result = await service.SyncAsync(CancellationToken.None);

        Assert.Equal(3, result.Count);
        Assert.Equal(3, repository.WrittenWeekends.Count);
        Assert.Contains(result, weekend => weekend.MeetingKey == "1280" && weekend.IsSprintWeekend);
        Assert.Contains(result, weekend => weekend.HighlightsVideoUrl == "https://www.youtube.com/watch?v=skyf1-finished");
    }

    [Fact]
    public async Task Official_calendar_sync_service_covers_highlight_skip_failure_detail_failure_and_cache_fallback_paths()
    {
        var config = CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 2);
        var repository = new SpyWeekendRepository
        {
            CachedWeekends =
            [
                new WeekendDocument("cache-2", "Cached 2", "Cached GP 2", 2, "01 - 02 MAR", "https://cache/2", "", "", false, "2026-03-01", "2026-03-02", null, [], "", "", "", ""),
                new WeekendDocument("cache-1", "Cached 1", "Cached GP 1", 1, "01 - 02 FEB", "https://cache/1", "", "", false, "2026-02-01", "2026-02-02", null, [], "", "", "", ""),
            ],
        };
        var seasonHtml = """
            <a href="/en/racing/2026/australia"><span>ROUND 1</span><span>06 - 08 MAR</span><span>Australia</span><span>FORMULA 1 AUSTRALIAN GRAND PRIX 2026</span><img src="fallback-hero.webp" /></a>
            <a href="/en/racing/2026/china"><span>ROUND 2</span><span>20 - 22 MAR</span><span>China</span><span>FORMULA 1 CHINESE GRAND PRIX 2026</span><img src="fallback-hero-2.webp" /></a>
        """;
        var service = new OfficialCalendarSyncService(
            config,
            repository,
            new ThrowingHighlightsLookupService(),
            new StubClock(new DateTimeOffset(2026, 03, 22, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Calendar.SeasonUrl] = seasonHtml,
                ["https://www.formula1.com/en/racing/2026/australia"] = """
                    <title>Australia GP - F1 Race</title>
                    <script>{"@type":"SportsEvent","name":"Race - Melbourne","startDate":"2026-03-08T05:00:00Z"}</script>
                """,
                ["https://www.formula1.com/en/racing/2026/china"] = "__throw__",
            }));

        var result = await service.SyncAsync(CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.Equal(string.Empty, result[0].HighlightsLookupStatus);
        Assert.Equal("china", result[1].MeetingKey);

        var skipService = new OfficialCalendarSyncService(
            config,
            new SpyWeekendRepository(),
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("ignored", "ignored", "ignored", "ignored")),
            new StubClock(new DateTimeOffset(2026, 03, 22, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Calendar.SeasonUrl] = seasonHtml,
                ["https://www.formula1.com/en/racing/2026/australia"] = "<title>Australia GP - F1 Race</title>",
                ["https://www.formula1.com/en/racing/2026/china"] = "<title>China GP - F1 Race</title>",
            }));

        var skipResult = await skipService.SyncAsync(CancellationToken.None);
        Assert.All(skipResult, weekend => Assert.Equal(string.Empty, weekend.HighlightsVideoUrl));

        var emptyCacheResult = await new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 5),
            new SpyWeekendRepository(),
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 22, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://formula1.example/en/racing/2026"] = "__throw__",
            }))
            .SyncAsync(CancellationToken.None);
        Assert.Empty(emptyCacheResult);

        var belowMinimumResult = await new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 3),
            repository,
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 22, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://formula1.example/en/racing/2026"] = """
                    <a href="/en/racing/2026/monaco"><span>ROUND 1</span><span>23 - 25 MAY</span><span>Monaco</span></a>
                """,
            }))
            .SyncAsync(CancellationToken.None);
        Assert.Equal(["cache-1", "cache-2"], belowMinimumResult.Select(weekend => weekend.MeetingKey).ToArray());
    }

    [Fact]
    public async Task Official_calendar_sync_service_retries_and_falls_back_to_cached_calendar()
    {
        var config = CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 20);
        var repository = new SpyWeekendRepository
        {
            CachedWeekends =
            [
                new WeekendDocument("cached", "Cached", "Cached GP", 1, "01 - 03 JAN", "https://example.com", "", "", false, "2026-01-01", "2026-01-03", null, [], "", "", "", ""),
            ],
        };
        var service = new OfficialCalendarSyncService(
            config,
            repository,
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Calendar.SeasonUrl] = "__throw__",
            }));

        var result = await service.SyncAsync(CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("cached", result[0].MeetingKey);
    }

    [Fact]
    public void Official_calendar_sync_service_parsers_cover_season_and_detail_edge_cases()
    {
        var service = new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 1),
            new SpyWeekendRepository(),
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>()));

        var seasonHtml = """
            <a href="/en/racing/2026/australia" class="group">
              <span>ROUND 1</span>
              <span>Chequered Flag</span>
              <span>06 - 08 Mar</span>
              <span>Flag of Australia</span>
              <span>Australia</span>
              <span>FORMULA 1 QATAR AIRWAYS AUSTRALIAN GRAND PRIX 2026</span>
              <img src="https://media.formula1.com/image/upload/races/card/australia.webp" />
            </a>
        """;
        var weekends = service.ParseSeasonCalendarPage(seasonHtml, 2026);
        var detail = service.ParseRaceDetailPage(
            """
            <title>China GP - F1 Race</title>
            <meta property="og:image" content="hero.webp" />
            <script>
              {"@type":"SportsEvent","name":"Sprint - Shanghai","startDate":"2026-03-21T03:30:00Z"}
              {"@type":"SportsEvent","name":"Race - Shanghai","startDate":"2026-03-22T07:00:00Z"}
            </script>
            https://www.formula1.com/en/results/2026/races/1280/china"
            https://media.formula1.com/image/upload/v1740000000/common/f1/2026/track/2026trackshanghaidetailed.webp
            /china/sprint-results
            """,
            "China",
            "china",
            "2026-03-22");

        Assert.Single(weekends);
        Assert.Equal("Australia", weekends[0].MeetingName);
        Assert.True(detail.IsSprintWeekend);
        Assert.Equal("1280", detail.MeetingKey);
        Assert.Equal("2026-03-22T07:00:00Z", detail.RaceStartTime);
        Assert.Equal(("2026-10-30", "2026-11-01"), OfficialCalendarSyncService.ParseDateRangeLabel("30 Oct - 01 Nov", 2026));
        Assert.Equal(("2026-03-08", "2026-03-08"), OfficialCalendarSyncService.ParseDateRangeLabel("08 Mar", 2026));
        Assert.Equal((string.Empty, string.Empty), OfficialCalendarSyncService.ParseDateRangeLabel("bad", 2026));
    }

    [Fact]
    public async Task Official_calendar_sync_service_internal_helpers_cover_fallback_paths_and_filters()
    {
        var service = new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 1),
            new SpyWeekendRepository(),
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>()));

        var seasonWeekends = service.ParseSeasonCalendarPage(
            """
            <a href="/en/racing/2026/pre-season-testing"><span>ROUND 0</span></a>
            <a href="/en/racing/2026/no-round"><span>Australia</span></a>
            <a href="/en/racing/2026/spain">
              <span>ROUND 9</span>
              <span>1ST</span>
              <span>BAR</span>
              <span>30 May - 01 Jun</span>
              <span>Spain</span>
              <img src="fallback-track.webp" />
            </a>
            """,
            2026);
        Assert.Single(seasonWeekends);
        Assert.Equal("fallback-track.webp", seasonWeekends[0].HeroImageUrl);
        Assert.Equal("2026-05-30", seasonWeekends[0].StartDate);
        Assert.Equal("2026-06-01", seasonWeekends[0].EndDate);

        var genericDetail = service.ParseRaceDetailPage(
            """
            <script>{"@type":"SportsEvent","name":"Practice 1 - Monaco","startDate":"2026-05-21T10:00:00Z"}</script>
            """,
            "Monaco",
            "monaco",
            "2026-05-24");
        Assert.Equal("monaco", genericDetail.MeetingKey);
        Assert.Equal("Monaco Grand Prix 2026", genericDetail.GrandPrixTitle);
        Assert.Equal("2026-05-21T10:00:00Z", genericDetail.RaceStartTime);

        var fallbackTimeDetail = service.ParseRaceDetailPage(string.Empty, "Imola", "imola", "2026-05-17");
        Assert.Equal("2026-05-17T14:00:00Z", fallbackTimeDetail.RaceStartTime);

        var mergedWeekend = OfficialCalendarSyncService.BuildWeekendWithDetailData(
            new WeekendDocument("slug", "Imola", "Imola GP", 1, "16 - 17 MAY", "detail", "hero", "track", false, "2026-05-16", "2026-05-17", null, [], null, null, null, null),
            new WeekendDocument("999", "Imola", "Imola GP", null, null, null, "", "", true, null, "2026-05-17", "2026-05-17T13:00:00Z", [new WeekendSessionDocument("Race", "2026-05-17T13:00:00Z")], null, null, null, null));
        var fallbackWeekend = OfficialCalendarSyncService.BuildWeekendWithHighlightsFallback(mergedWeekend);
        Assert.Equal(string.Empty, fallbackWeekend.HighlightsVideoUrl);
        Assert.True(OfficialCalendarSyncService.IsMeetingNameFragment("Imola"));
        Assert.False(OfficialCalendarSyncService.IsMeetingNameFragment("ROUND 1"));
        Assert.Equal(["Imola", "Race"], OfficialCalendarSyncService.ExtractTextFragments("<span>Imola</span><span>Race</span>").ToArray());
        Assert.Empty(OfficialCalendarSyncService.ExtractTextFragments(null!).ToArray());
        Assert.Equal("2026-03-21", OfficialCalendarSyncService.BuildIsoDate(2026, "MAR", "21"));
        Assert.Throws<ArgumentOutOfRangeException>(() => OfficialCalendarSyncService.BuildIsoDate(2026, "MA", "21"));
        Assert.Equal(string.Empty, OfficialCalendarSyncService.BuildIsoDate(2026, "MAR", "XX"));
        Assert.Equal("Race", OfficialCalendarSyncService.NormalizeText("<b>Race</b>"));
        Assert.Equal(string.Empty, OfficialCalendarSyncService.NormalizeText(null!));
        Assert.False(OfficialCalendarSyncService.IsMeetingNameFragment(null!));
        Assert.Empty(service.ParseSeasonCalendarPage(null!, 2026));
        var sparseSeasonWeekends = service.ParseSeasonCalendarPage(
            """
            <a href="/en/racing/2026/sparse">
              <span>ROUND 4</span>
              <span>FORMULA 1 SPARSE GRAND PRIX 2026</span>
            </a>
            """,
            2026);
        Assert.Single(sparseSeasonWeekends);
        Assert.Equal(string.Empty, sparseSeasonWeekends[0].DateRangeLabel);
        Assert.Equal(string.Empty, sparseSeasonWeekends[0].MeetingName);
        var noDetailUrlRepository = new SpyWeekendRepository();
        var noDetailUrlService = new OfficialCalendarSyncService(
            CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 1),
            noDetailUrlRepository,
            new StubHighlightsLookupService(false, new HighlightsLookupDocument("", "", "", "")),
            new StubClock(new DateTimeOffset(2026, 03, 13, 12, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                ["https://formula1.example/en/racing/2026"] = """
                    <a href="/en/racing/2026/"></a>
                    <a href="/en/racing/2026/imola"><span>ROUND 1</span><span>16 - 17 MAY</span><span>Imola</span></a>
                """,
            }));
        var noDetailResult = await noDetailUrlService.SyncAsync(CancellationToken.None);
        Assert.Single(noDetailResult);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.FetchHtmlAsync(string.Empty, CancellationToken.None));

        var practiceOnlyDetail = service.ParseRaceDetailPage(
            """
            <script>{"@type":"SportsEvent","name":"Practice 1 - Imola","startDate":"2026-05-16T10:00:00Z"}</script>
            """,
            "Imola",
            "imola",
            string.Empty);
        Assert.Equal("2026-05-16T10:00:00Z", practiceOnlyDetail.RaceStartTime);

        var nullDetail = service.ParseRaceDetailPage(null!, null!, null!, string.Empty);
        Assert.Equal(string.Empty, nullDetail.MeetingKey);
        Assert.Equal(" Grand Prix 2026", nullDetail.GrandPrixTitle);
    }

    [Fact]
    public async Task Official_calendar_sync_service_preserves_persisted_found_highlights_when_a_new_lookup_returns_missing()
    {
        var config = CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 1);
        var repository = new SpyWeekendRepository
        {
            CachedWeekends =
            [
                new WeekendDocument(
                    "1279",
                    "Australia",
                    "Australian Grand Prix 2026",
                    1,
                    "06 - 08 MAR",
                    "https://www.formula1.com/en/racing/2026/australia",
                    "hero-old.webp",
                    "track-old.webp",
                    false,
                    "2026-03-06",
                    "2026-03-08",
                    "2026-03-08T04:00:00.000Z",
                    [new WeekendSessionDocument("Race", "2026-03-08T04:00:00.000Z")],
                    "https://www.youtube.com/watch?v=persisted-found",
                    "2026-03-08T12:00:00.000Z",
                    "found",
                    "feed"),
            ],
        };
        var seasonHtml = """
            <a href="/en/racing/2026/australia"><span>ROUND 1</span><span>06 - 08 MAR</span><span>Australia</span><span>FORMULA 1 AUSTRALIAN GRAND PRIX 2026</span></a>
        """;
        var service = new OfficialCalendarSyncService(
            config,
            repository,
            new StubHighlightsLookupService(
                shouldLookup: true,
                result: new HighlightsLookupDocument(string.Empty, "2026-03-18T09:00:00.000Z", "missing", string.Empty)),
            new StubClock(new DateTimeOffset(2026, 03, 18, 10, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Calendar.SeasonUrl] = seasonHtml,
                ["https://www.formula1.com/en/racing/2026/australia"] = """
                    <title>Australia GP - F1 Race</title>
                    <script>{"@type":"SportsEvent","name":"Race - Melbourne","startDate":"2026-03-08T04:00:00.000Z"}</script>
                """,
            }));

        var result = await service.SyncAsync(CancellationToken.None);

        var australia = Assert.Single(result);
        Assert.Equal("https://www.youtube.com/watch?v=persisted-found", australia.HighlightsVideoUrl);
        Assert.Equal("found", australia.HighlightsLookupStatus);
        Assert.Equal("feed", australia.HighlightsLookupSource);
    }

    [Fact]
    public async Task Official_calendar_sync_service_preserves_persisted_found_highlights_when_a_new_lookup_throws()
    {
        var config = CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 1);
        var repository = new SpyWeekendRepository
        {
            CachedWeekends =
            [
                new WeekendDocument(
                    "1279",
                    "Australia",
                    "Australian Grand Prix 2026",
                    1,
                    "06 - 08 MAR",
                    "https://www.formula1.com/en/racing/2026/australia",
                    "hero-old.webp",
                    "track-old.webp",
                    false,
                    "2026-03-06",
                    "2026-03-08",
                    "2026-03-08T04:00:00.000Z",
                    [new WeekendSessionDocument("Race", "2026-03-08T04:00:00.000Z")],
                    "https://www.youtube.com/watch?v=persisted-found",
                    "2026-03-08T12:00:00.000Z",
                    "found",
                    "feed"),
            ],
        };
        var seasonHtml = """
            <a href="/en/racing/2026/australia"><span>ROUND 1</span><span>06 - 08 MAR</span><span>Australia</span><span>FORMULA 1 AUSTRALIAN GRAND PRIX 2026</span></a>
        """;
        var service = new OfficialCalendarSyncService(
            config,
            repository,
            new ThrowingHighlightsLookupService(),
            new StubClock(new DateTimeOffset(2026, 03, 18, 10, 00, 00, TimeSpan.Zero)),
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Calendar.SeasonUrl] = seasonHtml,
                ["https://www.formula1.com/en/racing/2026/australia"] = """
                    <title>Australia GP - F1 Race</title>
                    <script>{"@type":"SportsEvent","name":"Race - Melbourne","startDate":"2026-03-08T04:00:00.000Z"}</script>
                """,
            }));

        var result = await service.SyncAsync(CancellationToken.None);

        var australia = Assert.Single(result);
        Assert.Equal("https://www.youtube.com/watch?v=persisted-found", australia.HighlightsVideoUrl);
        Assert.Equal("found", australia.HighlightsLookupStatus);
        Assert.Equal("feed", australia.HighlightsLookupSource);
    }

    [Fact]
    public async Task Official_calendar_sync_service_uses_the_injected_clock_for_highlights_lookup_gating()
    {
        var config = CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 1);
        var repository = new SpyWeekendRepository();
        var lookup = new RecordingHighlightsLookupService();
        var seasonHtml = """
            <a href="/en/racing/2026/australia"><span>ROUND 1</span><span>06 - 08 MAR</span><span>Australia</span><span>FORMULA 1 AUSTRALIAN GRAND PRIX 2026</span></a>
        """;
        var injectedNow = new DateTimeOffset(2026, 03, 18, 10, 30, 00, TimeSpan.Zero);
        var service = new OfficialCalendarSyncService(
            config,
            repository,
            lookup,
            new StubClock(injectedNow),
            CreateHttpClient(new Dictionary<string, string>
            {
                [config.Calendar.SeasonUrl] = seasonHtml,
                ["https://www.formula1.com/en/racing/2026/australia"] = """
                    <title>Australia GP - F1 Race</title>
                    <script>{"@type":"SportsEvent","name":"Race - Melbourne","startDate":"2026-03-08T04:00:00.000Z"}</script>
                """,
            }));

        await service.SyncAsync(CancellationToken.None);

        Assert.Equal(injectedNow, lookup.LastShouldLookupNow);
    }

    [Fact]
    public void Official_calendar_sync_service_preserved_highlights_helpers_cover_null_persisted_fields()
    {
        var weekend = new WeekendDocument(
            "1279",
            "Australia",
            "Australian Grand Prix 2026",
            1,
            "06 - 08 MAR",
            "https://www.formula1.com/en/racing/2026/australia",
            "hero.webp",
            "track.webp",
            false,
            "2026-03-06",
            "2026-03-08",
            "2026-03-08T04:00:00.000Z",
            [new WeekendSessionDocument("Race", "2026-03-08T04:00:00.000Z")],
            "new-url",
            "new-checked-at",
            "new-status",
            "new-source");
        var persistedWeekend = weekend with
        {
            HighlightsVideoUrl = null,
            HighlightsLookupCheckedAt = null,
            HighlightsLookupStatus = null,
            HighlightsLookupSource = null,
        };

        var mergedWeekend = OfficialCalendarSyncService.BuildWeekendWithPersistedHighlights(weekend, persistedWeekend);

        Assert.Equal(string.Empty, mergedWeekend.HighlightsVideoUrl);
        Assert.Equal(string.Empty, mergedWeekend.HighlightsLookupCheckedAt);
        Assert.Equal(string.Empty, mergedWeekend.HighlightsLookupStatus);
        Assert.Equal(string.Empty, mergedWeekend.HighlightsLookupSource);
    }

    [Fact]
    public void Official_calendar_sync_service_persisted_weekend_index_supports_meeting_key_detail_url_slug_and_null_fallbacks()
    {
        var nestedType = typeof(OfficialCalendarSyncService).GetNestedType("PersistedWeekendIndex", BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("PersistedWeekendIndex nested type not found.");
        var createMethod = nestedType.GetMethod("Create", BindingFlags.Public | BindingFlags.Static)
            ?? throw new InvalidOperationException("PersistedWeekendIndex.Create not found.");
        var findMethod = nestedType.GetMethod(
            "Find",
            BindingFlags.Public | BindingFlags.Instance,
            null,
            [typeof(string), typeof(string), typeof(string)],
            null)
            ?? throw new InvalidOperationException("PersistedWeekendIndex.Find overload not found.");

        var weekends = new[]
        {
            new WeekendDocument(
                "1279",
                "Australia",
                "Australian Grand Prix 2026",
                1,
                "06 - 08 MAR",
                null,
                "",
                "",
                false,
                "2026-03-06",
                "2026-03-08",
                null,
                [],
                "https://www.youtube.com/watch?v=meeting-key",
                "",
                "found",
                "feed"),
            new WeekendDocument(
                "slug-only",
                "China",
                "Chinese Grand Prix 2026",
                2,
                "13 - 15 MAR",
                "https://www.formula1.com/en/racing/2026/china",
                "",
                "",
                true,
                "2026-03-13",
                "2026-03-15",
                null,
                [],
                "https://www.youtube.com/watch?v=slug",
                "",
                "found",
                "feed"),
            new WeekendDocument(
                "",
                "Japan",
                "Japanese Grand Prix 2026",
                3,
                "27 - 29 MAR",
                "https://www.formula1.com/en/racing/2026/japan",
                "",
                "",
                false,
                "2026-03-27",
                "2026-03-29",
                null,
                [],
                "https://www.youtube.com/watch?v=detail-url",
                "",
                "found",
                "feed"),
        };

        var index = createMethod.Invoke(null, [weekends])
            ?? throw new InvalidOperationException("PersistedWeekendIndex.Create returned null.");

        var byMeetingKey = (WeekendDocument?)findMethod.Invoke(index, ["1279", null, "australia"]);
        var byDetailUrl = (WeekendDocument?)findMethod.Invoke(index, [null, "https://www.formula1.com/en/racing/2026/japan", ""]);
        var bySlug = (WeekendDocument?)findMethod.Invoke(index, [null, "https://www.formula1.com/en/racing/2026/china", ""]);
        var byFallbackSlug = (WeekendDocument?)findMethod.Invoke(index, [null, null, "china"]);
        var missing = (WeekendDocument?)findMethod.Invoke(index, [null, null, ""]);

        Assert.Equal("https://www.youtube.com/watch?v=meeting-key", byMeetingKey?.HighlightsVideoUrl);
        Assert.Equal("https://www.youtube.com/watch?v=detail-url", byDetailUrl?.HighlightsVideoUrl);
        Assert.Equal("https://www.youtube.com/watch?v=slug", bySlug?.HighlightsVideoUrl);
        Assert.Equal("https://www.youtube.com/watch?v=slug", byFallbackSlug?.HighlightsVideoUrl);
        Assert.Null(missing);
    }

    [Fact]
    public void Porting_app_config_record_supports_value_equality()
    {
        var config = CreatePortingAppConfig(expectedDrivers: 22, expectedWeekends: 20);
        var clone = config with { };

        Assert.Equal(config, clone);
        Assert.Equal(config.GetHashCode(), clone.GetHashCode());
        Assert.Contains("PortingAppConfig", config.ToString(), StringComparison.Ordinal);
    }

    private static PortingAppConfig CreatePortingAppConfig(int expectedDrivers, int expectedWeekends)
    {
        return new PortingAppConfig(
            2026,
            new PortingDriversSourceConfig(
                "https://stats.example/2026.aspx",
                "https://formula1.example/en/drivers",
                "it",
                expectedDrivers,
                "test-agent",
                "it-IT",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["Alex Albon"] = "Alexander Albon",
                    ["Ollie Bearman"] = "Oliver Bearman",
                },
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["Alexander Albon"] = "alb",
                    ["Oliver Bearman"] = "bea",
                    ["Max Verstappen"] = "ver",
                },
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["Red Bull Racing"] = "Red Bull",
                },
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["williams"] = "Williams",
                    ["haas"] = "Haas",
                    ["redbullracing"] = "Red Bull",
                },
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["Williams"] = "#005AFF",
                    ["Haas"] = "#FFFFFF",
                    ["Red Bull"] = "#0600EF",
                    ["default"] = "#5F6673",
                }),
            new PortingCalendarSourceConfig(
                "https://formula1.example/en/racing/2026",
                expectedWeekends,
                "test-agent",
                "it-IT"));
    }

    private static HttpClient CreateHttpClient(IReadOnlyDictionary<string, string> responsesByUrl)
    {
        return new HttpClient(new StubHttpMessageHandler(responsesByUrl));
    }

    private static string GetRepositoryPath(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "AGENTS.md")))
        {
            directory = directory.Parent;
        }

        return Path.Combine(directory!.FullName, Path.Combine(segments));
    }

    private static string CreatePassword(string seedLabel)
    {
        return Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(seedLabel))).ToLowerInvariant();
    }

    private static MongoDatabaseHarness CreateMongoDatabase(
        IReadOnlyDictionary<string, IReadOnlyList<BsonDocument>> documentsByCollection,
        IReadOnlyDictionary<string, Func<BsonDocument, Exception?>>? insertBehaviorByCollection = null)
    {
        var insertedDocuments = new List<BsonDocument>();
        var seededDocuments = documentsByCollection.ToDictionary(
            pair => pair.Key,
            pair => pair.Value.Select(document => document.DeepClone().AsBsonDocument).ToList(),
            StringComparer.Ordinal);
        var deleteManyCalled = false;
        IMongoDatabase? database = null;
        database = ProxyFactory<IMongoDatabase>.Create((method, args) =>
        {
            if (method.Name == nameof(IMongoDatabase.GetCollection))
            {
                var collectionName = (string)args![0]!;
                return CreateCollection(
                    database!,
                    collectionName,
                    seededDocuments,
                    insertedDocuments,
                    () => deleteManyCalled = true,
                    insertBehaviorByCollection is not null && insertBehaviorByCollection.TryGetValue(collectionName, out var insertBehavior)
                        ? insertBehavior
                        : null);
            }

            if (method.Name == "get_DatabaseNamespace")
            {
                return new DatabaseNamespace("fantaf1_porting_tests");
            }

            throw new NotSupportedException(method.Name);
        });

        return new MongoDatabaseHarness(database, insertedDocuments, () => deleteManyCalled);
    }

    private static IMongoCollection<BsonDocument> CreateCollection(
        IMongoDatabase database,
        string collectionName,
        Dictionary<string, List<BsonDocument>> seededDocuments,
        List<BsonDocument> insertedDocuments,
        Action onDeleteMany,
        Func<BsonDocument, Exception?>? insertBehavior)
    {
        seededDocuments.TryAdd(collectionName, []);

        return ProxyFactory<IMongoCollection<BsonDocument>>.Create((method, args) =>
        {
            if (method.Name == "get_CollectionNamespace")
            {
                return new CollectionNamespace(new DatabaseNamespace("fantaf1_porting_tests"), collectionName);
            }

            if (method.Name == "get_Database")
            {
                return database;
            }

            if (method.Name == "get_DocumentSerializer")
            {
                return BsonDocumentSerializer.Instance;
            }

            if (method.Name == "get_Settings")
            {
                return new MongoCollectionSettings();
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.FindAsync) || method.Name == nameof(IMongoCollection<BsonDocument>.FindSync))
            {
                var cursor = new SingleBatchAsyncCursor<BsonDocument>(seededDocuments[collectionName]);
                return method.Name == nameof(IMongoCollection<BsonDocument>.FindAsync)
                    ? CreateCompletedTask(method.ReturnType, cursor)
                    : cursor;
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.InsertOneAsync))
            {
                var document = ((BsonDocument)args![0]!).DeepClone().AsBsonDocument;
                var insertException = insertBehavior?.Invoke(document);
                if (insertException is not null)
                {
                    throw insertException;
                }

                insertedDocuments.Add(document);
                seededDocuments[collectionName].Add(document);
                return Task.CompletedTask;
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.InsertManyAsync))
            {
                foreach (var document in (IEnumerable<BsonDocument>)args![0]!)
                {
                    var clone = document.DeepClone().AsBsonDocument;
                    var insertException = insertBehavior?.Invoke(clone);
                    if (insertException is not null)
                    {
                        throw insertException;
                    }

                    insertedDocuments.Add(clone);
                    seededDocuments[collectionName].Add(clone);
                }

                return Task.CompletedTask;
            }

            if (method.Name == nameof(IMongoCollection<BsonDocument>.DeleteManyAsync))
            {
                onDeleteMany();
                seededDocuments[collectionName].Clear();
                return CreateCompletedTask(method.ReturnType, new AcknowledgedDeleteResult());
            }

            throw new NotSupportedException(method.Name);
        });
    }

    private static object CreateCompletedTask(Type taskType, object result)
    {
        var resultType = taskType.GetGenericArguments().Single();
        var fromResult = typeof(Task)
            .GetMethods(BindingFlags.Public | BindingFlags.Static)
            .Single(method => method.Name == nameof(Task.FromResult) && method.IsGenericMethodDefinition);

        return fromResult.MakeGenericMethod(resultType).Invoke(null, [result])!;
    }

    private sealed record MongoDatabaseHarness(
        IMongoDatabase Database,
        List<BsonDocument> InsertedDocuments,
        Func<bool> DeleteManyAccessor)
    {
        public bool DeleteManyCalled => DeleteManyAccessor();
    }

    private sealed class SpyAdminCredentialRepository : IAdminCredentialRepository
    {
        public bool EnsureCalled { get; private set; }

        public Task EnsureDefaultCredentialAsync(CancellationToken cancellationToken)
        {
            EnsureCalled = true;
            return Task.CompletedTask;
        }

        public Task<bool> VerifyPasswordAsync(string password, CancellationToken cancellationToken)
        {
            return Task.FromResult(true);
        }
    }

    private sealed class SpyBackgroundSyncService : IBackgroundSyncService
    {
        public bool RunCalled { get; private set; }

        public Task RunAsync(CancellationToken cancellationToken)
        {
            RunCalled = true;
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingBackgroundSyncService : IBackgroundSyncService
    {
        public Task RunAsync(CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("background-sync");
        }
    }

    private sealed class StubRuntimeEnvironmentProfileResolver : IRuntimeEnvironmentProfileResolver
    {
        private readonly RuntimeEnvironmentProfile _profile;

        public StubRuntimeEnvironmentProfileResolver(RuntimeEnvironmentProfile profile)
        {
            _profile = profile;
        }

        public RuntimeEnvironmentProfile ResolveCurrentProfile()
        {
            return _profile;
        }
    }

    private sealed class StubHostApplicationLifetime : IHostApplicationLifetime
    {
        private readonly CancellationTokenSource _started = new();

        public CancellationToken ApplicationStarted => _started.Token;
        public CancellationToken ApplicationStopping => CancellationToken.None;
        public CancellationToken ApplicationStopped => CancellationToken.None;

        public void StopApplication()
        {
        }

        public void RaiseStarted()
        {
            _started.Cancel();
        }
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public StubHostEnvironment(string contentRootPath)
        {
            ContentRootPath = contentRootPath;
            ContentRootFileProvider = new PhysicalFileProvider(contentRootPath);
        }

        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "FantaF1.Tests";
        public string ContentRootPath { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; }
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly IReadOnlyDictionary<string, string> _responsesByUrl;

        public StubHttpMessageHandler(IReadOnlyDictionary<string, string> responsesByUrl)
        {
            _responsesByUrl = responsesByUrl;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var url = request.RequestUri?.ToString() ?? string.Empty;
            if (!_responsesByUrl.TryGetValue(url, out var payload))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
            }

            if (payload == "__throw__")
            {
                throw new InvalidOperationException($"Forced failure for {url}");
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(payload, Encoding.UTF8, "text/html"),
            });
        }
    }

    private sealed class StubStandingsSyncService : IStandingsSyncService
    {
        private readonly Exception? _exception;

        public StubStandingsSyncService(Exception? exception = null)
        {
            _exception = exception;
        }

        public int Calls { get; private set; }

        public Task<StandingsDocument> SyncAsync(CancellationToken cancellationToken)
        {
            Calls += 1;
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(new StandingsDocument([], [], string.Empty));
        }
    }

    private sealed class StubHighlightsLookupService : IRaceHighlightsLookupService
    {
        private readonly bool _shouldLookup;
        private readonly HighlightsLookupDocument _result;

        public StubHighlightsLookupService(bool shouldLookup, HighlightsLookupDocument result)
        {
            _shouldLookup = shouldLookup;
            _result = result;
        }

        public bool ShouldLookup(WeekendDocument race, DateTimeOffset now)
        {
            return _shouldLookup;
        }

        public Task<HighlightsLookupDocument> ResolveAsync(WeekendDocument race, CancellationToken cancellationToken)
        {
            return Task.FromResult(_result);
        }
    }

    private sealed class ThrowingHighlightsLookupService : IRaceHighlightsLookupService
    {
        public bool ShouldLookup(WeekendDocument race, DateTimeOffset now)
        {
            return true;
        }

        public Task<HighlightsLookupDocument> ResolveAsync(WeekendDocument race, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("highlights");
        }
    }

    private sealed class RecordingHighlightsLookupService : IRaceHighlightsLookupService
    {
        public DateTimeOffset? LastShouldLookupNow { get; private set; }

        public bool ShouldLookup(WeekendDocument race, DateTimeOffset now)
        {
            LastShouldLookupNow = now;
            return false;
        }

        public Task<HighlightsLookupDocument> ResolveAsync(WeekendDocument race, CancellationToken cancellationToken)
        {
            throw new NotSupportedException("ResolveAsync should not be called when ShouldLookup returns false.");
        }
    }

    private sealed class SpyDriverRepository : IDriverRepository
    {
        public IReadOnlyList<DriverDocument> CachedDrivers { get; init; } = [];
        public List<DriverDocument> WrittenDrivers { get; } = [];

        public Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(CachedDrivers);
        }

        public Task WriteAllAsync(IReadOnlyList<DriverDocument> drivers, CancellationToken cancellationToken)
        {
            WrittenDrivers.Clear();
            WrittenDrivers.AddRange(drivers);
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingDriverRepository : IDriverRepository
    {
        public Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("driver-cache");
        }

        public Task WriteAllAsync(IReadOnlyList<DriverDocument> drivers, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("driver-write");
        }
    }

    private sealed class SpyWeekendRepository : IWeekendRepository
    {
        public IReadOnlyList<WeekendDocument> CachedWeekends { get; init; } = [];
        public List<WeekendDocument> WrittenWeekends { get; } = [];

        public Task<WeekendDocument?> GetByIdAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<IReadOnlyList<WeekendDocument>> GetAllAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task UpdateAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task DeleteAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();

        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(CachedWeekends);
        }

        public Task WriteAllAsync(IReadOnlyList<WeekendDocument> weekends, CancellationToken cancellationToken)
        {
            WrittenWeekends.Clear();
            WrittenWeekends.AddRange(weekends);
            return Task.CompletedTask;
        }

        public Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingWeekendRepository : IWeekendRepository
    {
        public Task<WeekendDocument?> GetByIdAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<IReadOnlyList<WeekendDocument>> GetAllAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task UpdateAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task DeleteAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();

        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("calendar-cache");
        }

        public Task WriteAllAsync(IReadOnlyList<WeekendDocument> weekends, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("calendar-write");
        }

        public Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("calendar-highlights");
        }
    }

    private class ProxyFactory<T> : DispatchProxy
        where T : class
    {
        private Func<MethodInfo, object?[]?, object?>? _handler;

        public static T Create(Func<MethodInfo, object?[]?, object?> handler)
        {
            var proxy = DispatchProxy.Create<T, ProxyFactory<T>>();
            ((ProxyFactory<T>)(object)proxy)._handler = handler;
            return proxy;
        }

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            return _handler!(targetMethod!, args);
        }
    }

    private sealed class SingleBatchAsyncCursor<T> : IAsyncCursor<T>
    {
        private readonly IReadOnlyList<T> _batch;
        private int _state = -1;

        public SingleBatchAsyncCursor(IReadOnlyList<T> batch)
        {
            _batch = batch;
        }

        public IEnumerable<T> Current => _state == 0 ? _batch : [];

        public void Dispose()
        {
        }

        public bool MoveNext(CancellationToken cancellationToken = default)
        {
            if (_state >= 0)
            {
                _state = 1;
                return false;
            }

            _state = 0;
            return true;
        }

        public Task<bool> MoveNextAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(MoveNext(cancellationToken));
        }
    }

    private sealed class AcknowledgedDeleteResult : DeleteResult
    {
        public override bool IsAcknowledged => true;
        public override long DeletedCount => 1;
    }

    private static MongoWriteException CreateDuplicateKeyWriteException()
    {
        var writeError = (WriteError)typeof(WriteError)
            .GetConstructors(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
            .Single()
            .Invoke([ServerErrorCategory.DuplicateKey, 11000, "duplicate key", new BsonDocument()]);

        return new MongoWriteException(
            new MongoDB.Driver.Core.Connections.ConnectionId(
                new MongoDB.Driver.Core.Servers.ServerId(
                    new MongoDB.Driver.Core.Clusters.ClusterId(),
                    new IPEndPoint(IPAddress.Loopback, 27017))),
            writeError,
            null,
            null);
    }
}
