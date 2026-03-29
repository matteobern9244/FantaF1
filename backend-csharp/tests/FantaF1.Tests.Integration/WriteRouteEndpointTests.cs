using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using FantaF1.Api.Controllers;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FantaF1.Tests.Integration;

public sealed class WriteRouteEndpointTests
{
    [Fact]
    public void Predictions_controller_requires_a_save_service_dependency()
    {
        var exception = Assert.Throws<ArgumentNullException>(() => new PredictionsController(null!));

        Assert.Equal("saveRequestService", exception.ParamName);
    }

    [Fact]
    public async Task Development_post_data_allows_the_non_manual_all_empty_payload()
    {
        var repository = new StubAppDataRepository();
        await using var factory = CreateFactory(
            "Development",
            services =>
            {
                services.RemoveAll<IAppDataRepository>();
                services.RemoveAll<IWeekendRepository>();
                services.RemoveAll<IClock>();
                services.AddSingleton<IAppDataRepository>(repository);
                services.AddSingleton<IWeekendRepository>(new StubWeekendRepository([]));
                services.AddSingleton<IClock>(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));
            });
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/data", CreatePayload());
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal(SaveRouteContract.SaveSuccessMessage, payload["message"]?.ToString());
        Assert.True(repository.WriteCalled);
    }

    [Fact]
    public async Task Development_post_predictions_rejects_an_all_empty_payload()
    {
        await using var factory = CreateFactory(
            "Development",
            services =>
            {
                services.RemoveAll<IAppDataRepository>();
                services.RemoveAll<IWeekendRepository>();
                services.RemoveAll<IClock>();
                services.AddSingleton<IAppDataRepository>(new StubAppDataRepository());
                services.AddSingleton<IWeekendRepository>(new StubWeekendRepository([]));
                services.AddSingleton<IClock>(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));
            });
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/predictions", CreatePayload());
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal(SaveRouteContract.PredictionsMissingCode, payload["code"]?.ToString());
        Assert.Equal("req-integration", payload["requestId"]?.ToString());
    }

    [Fact]
    public async Task Production_post_data_requires_an_admin_session()
    {
        await using var factory = CreateFactory("Production");
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/data", CreatePayload());
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal(SaveRouteContract.AdminAuthRequiredCode, payload["code"]?.ToString());
        Assert.False(payload.ContainsKey("requestId"));
    }

    [Fact]
    public async Task Production_post_predictions_accepts_a_valid_admin_session_cookie()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"]);
        var password = CreatePassword("subphase-6-production-login");
        await using var factory = CreateFactory(
            "Production",
            services =>
            {
                services.RemoveAll<IAppDataRepository>();
                services.RemoveAll<IWeekendRepository>();
                services.RemoveAll<IClock>();
                services.AddSingleton<IAppDataRepository>(repository);
                services.AddSingleton<IWeekendRepository>(new StubWeekendRepository([]));
                services.AddSingleton<IClock>(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));
            },
            CreateAdminCredentialSeedConfiguration(password, "subphase-6-production-salt"));
        using var client = factory.CreateClient();

        var loginResponse = await client.PostAsJsonAsync("/api/admin/session", new { password });
        var cookieHeader = loginResponse.Headers.GetValues("Set-Cookie").Single().Split(';', 2, StringSplitOptions.None)[0];

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/predictions")
        {
            Content = JsonContent.Create(CreatePayload("ver")),
        };
        request.Headers.Add("Cookie", cookieHeader);

        var response = await client.SendAsync(request);
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal(SaveRouteContract.SaveSuccessMessage, payload["message"]?.ToString());
        Assert.True(repository.WriteCalled);
    }

    [Fact]
    public async Task Development_post_data_returns_the_generic_save_error_payload_when_persistence_fails()
    {
        await using var factory = CreateFactory(
            "Development",
            services =>
            {
                services.RemoveAll<IAppDataRepository>();
                services.RemoveAll<IWeekendRepository>();
                services.RemoveAll<IClock>();
                services.AddSingleton<IAppDataRepository>(new StubAppDataRepository(writeException: new InvalidOperationException("mongo write failed")));
                services.AddSingleton<IWeekendRepository>(new StubWeekendRepository([]));
                services.AddSingleton<IClock>(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));
            });
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/data", CreatePayload());
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal(SaveRouteContract.StorageWriteFailedCode, payload["code"]?.ToString());
        Assert.Equal("req-integration", payload["requestId"]?.ToString());
    }

    private static WebApplicationFactory<Program> CreateFactory(
        string environmentName,
        Action<IServiceCollection>? configureServices = null,
        IReadOnlyDictionary<string, string?>? configurationValues = null)
    {
        var dbName = environmentName == "Production" ? "fantaf1" : "fantaf1_dev";

        return new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment(environmentName);
                builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                {
                    configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["MONGODB_URI"] = $"mongodb+srv://user:pass@cluster.mongodb.net/{dbName}?retryWrites=true&w=majority",
                        [AdminSessionContract.SessionSecretEnvironmentVariableName] = "integration-admin-secret",
                        ["Bootstrap:DisableHostedService"] = "true",
                    });

                    if (configurationValues is not null)
                    {
                        configurationBuilder.AddInMemoryCollection(configurationValues);
                    }
                });
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<IRequestIdGenerator>();
                    services.AddSingleton<IRequestIdGenerator>(new StubRequestIdGenerator());
                    configureServices?.Invoke(services);
                });
            });
    }

    private static Dictionary<string, string?> CreateAdminCredentialSeedConfiguration(string password, string saltSeedLabel)
    {
        var salt = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(saltSeedLabel)))
            .ToLowerInvariant()[..32];
        var hasher = new NodeCompatibleScryptPasswordHasher();

        return new Dictionary<string, string?>
        {
            [ContractAdminCredentialSeedOptions.PasswordHashHexConfigurationPath] = hasher.HashPassword(password, salt),
            [ContractAdminCredentialSeedOptions.PasswordSaltConfigurationPath] = salt,
        };
    }

    private static string CreatePassword(string seedLabel)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(seedLabel))).ToLowerInvariant();
    }

    private static AppDataDocument CreatePayload(string firstPrediction = "")
    {
        return new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument(firstPrediction, "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
            ],
            History: [],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("", "", "", ""),
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: null);
    }

    private sealed class StubAppDataRepository : IAppDataRepository
    {
        private readonly IReadOnlyList<string>? _persistedParticipantRoster;
        private readonly Exception? _writeException;

        public StubAppDataRepository(IReadOnlyList<string>? persistedParticipantRoster = null, Exception? writeException = null)
        {
            _persistedParticipantRoster = persistedParticipantRoster;
            _writeException = writeException;
        }

        public bool WriteCalled { get; private set; }

        public Task<AppDataDocument?> ReadLatestAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult<AppDataDocument?>(null);
        }

        public Task<IReadOnlyList<string>?> ReadPersistedParticipantRosterAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_persistedParticipantRoster);
        }

        public Task WriteAsync(AppDataDocument document, CancellationToken cancellationToken)
        {
            WriteCalled = true;

            if (_writeException is not null)
            {
                throw _writeException;
            }

            return Task.CompletedTask;
        }
    }

    private sealed class StubWeekendRepository : IWeekendRepository
    {
        private readonly IReadOnlyList<WeekendDocument> _documents;

        public StubWeekendRepository(IReadOnlyList<WeekendDocument> documents)
        {
            _documents = documents;
        }

        public Task<WeekendDocument?> GetByIdAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<IReadOnlyList<WeekendDocument>> GetAllAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task UpdateAsync(WeekendDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task DeleteAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();

        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_documents);
        }

        public Task WriteAllAsync(IReadOnlyList<WeekendDocument> weekends, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task WriteHighlightsLookupAsync(string meetingKey, HighlightsLookupDocument lookup, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class StubRequestIdGenerator : IRequestIdGenerator
    {
        public string Generate()
        {
            return "req-integration";
        }
    }
}
