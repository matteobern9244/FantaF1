using System.Net;
using System.Net.Http.Json;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace FantaF1.Tests.Integration;

public sealed class ReadRouteEndpointTests
{
    [Fact]
    public async Task Data_endpoint_returns_the_sanitized_node_compatible_payload()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IAppDataRepository>();
            services.RemoveAll<IWeekendRepository>();
            services.RemoveAll<IClock>();
            services.AddSingleton<IAppDataRepository>(new StubAppDataRepository(new AppDataDocument(
                Users:
                [
                    new AppDataUserDocument(string.Empty, new PredictionDocument("legacy", null, null, null), double.NaN),
                    new AppDataUserDocument("Valid User", new PredictionDocument("ver", string.Empty, string.Empty, string.Empty), 7),
                ],
                History: [],
                GpName: "Monaco Grand Prix",
                RaceResults: new PredictionDocument("legacy", null, null, null),
                SelectedMeetingKey: "missing",
                WeekendStateByMeetingKey: null)));
            services.AddSingleton<IWeekendRepository>(new StubWeekendRepository(
            [
                new WeekendDocument("monaco", "Monaco", "Monaco Grand Prix", 7, null, null, null, null, false, "2026-05-24", "2026-05-24", null, [], string.Empty, string.Empty, string.Empty, string.Empty),
            ]));
            services.AddSingleton<IClock>(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));
        });
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<Dictionary<string, object>>("/api/data");

        Assert.NotNull(payload);
        Assert.Equal("Monaco Grand Prix", payload["gpName"]?.ToString());
        Assert.Equal("monaco", payload["selectedMeetingKey"]?.ToString());
    }

    [Fact]
    public async Task Data_endpoint_returns_default_app_data_with_a_200_when_the_repository_fails()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IAppDataRepository>();
            services.RemoveAll<IWeekendRepository>();
            services.RemoveAll<IClock>();
            services.AddSingleton<IAppDataRepository>(new StubAppDataRepository(exception: new InvalidOperationException("boom")));
            services.AddSingleton<IWeekendRepository>(new StubWeekendRepository([]));
            services.AddSingleton<IClock>(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)));
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/data");
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(payload);
        Assert.True(payload.ContainsKey("users"));
    }

    [Fact]
    public async Task Data_endpoint_returns_a_node_compatible_500_when_the_service_throws_unexpectedly()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IAppDataReadService>();
            services.AddSingleton<IAppDataReadService>(new ThrowingAppDataReadService());
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/data");
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal("Failed to read app data", payload["error"]?.ToString());
    }

    [Fact]
    public async Task Drivers_endpoint_returns_the_sorted_payload_and_falls_back_to_an_empty_list_on_repository_errors()
    {
        await using var sortedFactory = CreateFactory(services =>
        {
            services.RemoveAll<IDriverRepository>();
            services.AddSingleton<IDriverRepository>(new StubDriverRepository(
            [
                new DriverDocument("zed", "Zed Driver", "Team A", "red", null, null),
                new DriverDocument("alpha", "Alpha Driver", "Team A", "blue", null, null),
            ]));
        });
        await using var fallbackFactory = CreateFactory(services =>
        {
            services.RemoveAll<IDriverRepository>();
            services.AddSingleton<IDriverRepository>(new StubDriverRepository(exception: new InvalidOperationException("boom")));
        });
        using var sortedClient = sortedFactory.CreateClient();
        using var fallbackClient = fallbackFactory.CreateClient();

        var sortedPayload = await sortedClient.GetFromJsonAsync<List<Dictionary<string, object>>>("/api/drivers");
        var fallbackPayload = await fallbackClient.GetFromJsonAsync<List<Dictionary<string, object>>>("/api/drivers");

        Assert.NotNull(sortedPayload);
        Assert.Equal(["Alpha Driver", "Zed Driver"], sortedPayload.Select(driver => driver["name"].ToString()).ToArray());
        Assert.NotNull(fallbackPayload);
        Assert.Empty(fallbackPayload);
    }

    [Fact]
    public async Task Drivers_endpoint_returns_a_node_compatible_500_when_the_service_throws_unexpectedly()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IDriverReadService>();
            services.AddSingleton<IDriverReadService>(new ThrowingDriverReadService());
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/drivers");
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal("Failed to read drivers", payload["error"]?.ToString());
    }

    [Fact]
    public async Task Calendar_endpoint_returns_the_sorted_payload_and_falls_back_to_an_empty_list_on_repository_errors()
    {
        await using var sortedFactory = CreateFactory(services =>
        {
            services.RemoveAll<IWeekendRepository>();
            services.AddSingleton<IWeekendRepository>(new StubWeekendRepository(
            [
                new WeekendDocument("race-2", "Race 2", "Grand Prix 2", 2, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty),
                new WeekendDocument("race-1", "Race 1", "Grand Prix 1", 1, null, null, null, null, false, null, null, null, [], string.Empty, string.Empty, string.Empty, string.Empty),
            ]));
        });
        await using var fallbackFactory = CreateFactory(services =>
        {
            services.RemoveAll<IWeekendRepository>();
            services.AddSingleton<IWeekendRepository>(new StubWeekendRepository(exception: new InvalidOperationException("boom")));
        });
        using var sortedClient = sortedFactory.CreateClient();
        using var fallbackClient = fallbackFactory.CreateClient();

        var sortedPayload = await sortedClient.GetFromJsonAsync<List<Dictionary<string, object>>>("/api/calendar");
        var fallbackPayload = await fallbackClient.GetFromJsonAsync<List<Dictionary<string, object>>>("/api/calendar");

        Assert.NotNull(sortedPayload);
        Assert.Equal(["race-1", "race-2"], sortedPayload.Select(weekend => weekend["meetingKey"].ToString()).ToArray());
        Assert.NotNull(fallbackPayload);
        Assert.Empty(fallbackPayload);
    }

    [Fact]
    public async Task Calendar_endpoint_returns_a_node_compatible_500_when_the_service_throws_unexpectedly()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<ICalendarReadService>();
            services.AddSingleton<ICalendarReadService>(new ThrowingCalendarReadService());
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/calendar");
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal("Failed to read calendar", payload["error"]?.ToString());
    }

    [Fact]
    public async Task Standings_endpoint_returns_the_cached_payload()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IStandingsReadService>();
            services.AddSingleton<IStandingsReadService>(new StubStandingsReadService(
                new StandingsDocument(
                [
                    new DriverStandingDocument(1, "pia", "Oscar Piastri", "McLaren", 99, "https://media.example.com/pia.webp", "#FF8700"),
                ],
                [
                    new ConstructorStandingDocument(1, "McLaren", 188, "#FF8700", "https://media.example.com/mclaren.webp"),
                ],
                "2026-03-13T10:00:00.000Z")));
        });
        using var client = factory.CreateClient();

        var payload = await client.GetFromJsonAsync<Dictionary<string, object>>("/api/standings");

        Assert.NotNull(payload);
        Assert.Equal("2026-03-13T10:00:00.000Z", payload["updatedAt"]?.ToString());
        Assert.True(payload.ContainsKey("driverStandings"));
        Assert.True(payload.ContainsKey("constructorStandings"));
    }

    [Fact]
    public async Task Standings_endpoint_returns_a_node_compatible_500_when_the_service_throws_unexpectedly()
    {
        await using var factory = CreateFactory(services =>
        {
            services.RemoveAll<IStandingsReadService>();
            services.AddSingleton<IStandingsReadService>(new ThrowingStandingsReadService());
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/standings");
        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal("Failed to read standings", payload["error"]?.ToString());
    }

    private static WebApplicationFactory<Program> CreateFactory(Action<IServiceCollection>? configureServices = null)
    {
        return new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Development");
                builder.ConfigureAppConfiguration((_, configurationBuilder) =>
                {
                    configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["MONGODB_URI"] = "mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_porting?retryWrites=true&w=majority",
                        ["ADMIN_SESSION_SECRET"] = "integration-admin-secret",
                    });
                });
                builder.ConfigureServices(services =>
                {
                    configureServices?.Invoke(services);
                });
            });
    }

    private sealed class StubAppDataRepository : IAppDataRepository
    {
        private readonly AppDataDocument? _document;
        private readonly Exception? _exception;

        public StubAppDataRepository(AppDataDocument? document = null, Exception? exception = null)
        {
            _document = document;
            _exception = exception;
        }

        public Task<AppDataDocument?> ReadLatestAsync(CancellationToken cancellationToken)
        {
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_document);
        }

        public Task<IReadOnlyList<string>?> ReadPersistedParticipantRosterAsync(CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }

        public Task WriteAsync(AppDataDocument document, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class StubDriverRepository : IDriverRepository
    {
        private readonly IReadOnlyList<DriverDocument> _documents;
        private readonly Exception? _exception;

        public StubDriverRepository(IReadOnlyList<DriverDocument>? documents = null, Exception? exception = null)
        {
            _documents = documents ?? [];
            _exception = exception;
        }

        public Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_documents);
        }
    }

    private sealed class StubWeekendRepository : IWeekendRepository
    {
        private readonly IReadOnlyList<WeekendDocument> _documents;
        private readonly Exception? _exception;

        public StubWeekendRepository(IReadOnlyList<WeekendDocument>? documents = null, Exception? exception = null)
        {
            _documents = documents ?? [];
            _exception = exception;
        }

        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_documents);
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

    private sealed class ThrowingAppDataReadService : IAppDataReadService
    {
        public Task<AppDataDocument> ReadAsync(CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("unexpected service failure");
        }
    }

    private sealed class ThrowingDriverReadService : IDriverReadService
    {
        public Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("unexpected service failure");
        }
    }

    private sealed class ThrowingCalendarReadService : ICalendarReadService
    {
        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("unexpected service failure");
        }
    }

    private sealed class StubStandingsReadService : IStandingsReadService
    {
        private readonly StandingsDocument _document;

        public StubStandingsReadService(StandingsDocument document)
        {
            _document = document;
        }

        public Task<StandingsDocument> ReadAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_document);
        }
    }

    private sealed class ThrowingStandingsReadService : IStandingsReadService
    {
        public Task<StandingsDocument> ReadAsync(CancellationToken cancellationToken)
        {
            throw new InvalidOperationException("unexpected service failure");
        }
    }
}
