using System.Text;
using System.Reflection;
using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;
using FantaF1.Domain.ReadModels;
using FantaF1.Infrastructure.Standings;

namespace FantaF1.Tests.Unit;

public sealed class StandingsServiceTests
{
    [Fact]
    public void Standings_services_and_parser_reject_null_dependencies()
    {
        var standingsRepository = new StubStandingsRepository();
        var driverRepository = new StubDriverRepository();
        var sourceClient = new StubStandingsSourceClient();
        var parser = new OfficialStandingsParser();
        var clock = new StubClock(new DateTimeOffset(2026, 03, 13, 10, 00, 00, TimeSpan.Zero));

        Assert.Throws<ArgumentNullException>(() => new StandingsReadService(null!, new StubStandingsSyncService(new StandingsDocument([], [], string.Empty))));
        Assert.Throws<ArgumentNullException>(() => new StandingsReadService(standingsRepository, null!));
        Assert.Throws<ArgumentNullException>(() => new StandingsSyncService(null!, driverRepository, sourceClient, parser, clock));
        Assert.Throws<ArgumentNullException>(() => new StandingsSyncService(standingsRepository, null!, sourceClient, parser, clock));
        Assert.Throws<ArgumentNullException>(() => new StandingsSyncService(standingsRepository, driverRepository, null!, parser, clock));
        Assert.Throws<ArgumentNullException>(() => new StandingsSyncService(standingsRepository, driverRepository, sourceClient, null!, clock));
        Assert.Throws<ArgumentNullException>(() => new StandingsSyncService(standingsRepository, driverRepository, sourceClient, parser, null!));
    }

    [Fact]
    public async Task Standings_read_service_returns_the_cached_payload_without_triggering_sync_when_cache_is_available()
    {
        var syncService = new StubStandingsSyncService(new StandingsDocument([], [], string.Empty));
        var service = new StandingsReadService(
            new StubStandingsRepository(
                new StandingsDocument(
                [
                    new DriverStandingDocument(1, "pia", "Oscar Piastri", "McLaren", 99, "https://media.example.com/pia.webp", "#FF8700"),
                ],
                [
                    new ConstructorStandingDocument(1, "McLaren", 188, "#FF8700", "https://media.example.com/mclaren.webp"),
                ],
                "2026-03-13T10:00:00.000Z")),
            syncService);

        var result = await service.ReadAsync(CancellationToken.None);

        Assert.Equal("2026-03-13T10:00:00.000Z", result.UpdatedAt);
        Assert.False(syncService.WasCalled);
    }

    [Fact]
    public async Task Standings_read_service_triggers_sync_when_the_cache_is_empty()
    {
        var syncPayload = new StandingsDocument(
        [
            new DriverStandingDocument(1, "pia", "Oscar Piastri", "McLaren", 99, "https://media.example.com/pia.webp", "#FF8700"),
        ],
        [
            new ConstructorStandingDocument(1, "McLaren", 188, "#FF8700", "https://media.example.com/mclaren.webp"),
        ],
        "2026-03-13T10:00:00.000Z");
        var syncService = new StubStandingsSyncService(syncPayload);
        var service = new StandingsReadService(
            new StubStandingsRepository(new StandingsDocument([], [], string.Empty)),
            syncService);

        var result = await service.ReadAsync(CancellationToken.None);

        Assert.True(syncService.WasCalled);
        Assert.Equal(syncPayload, result);
    }

    [Fact]
    public async Task Standings_sync_service_persists_a_valid_payload_and_falls_back_to_cache_when_the_source_is_invalid()
    {
        var repository = new StubStandingsRepository(
            new StandingsDocument(
            [
                new DriverStandingDocument(1, "cached", "Cached Driver", "Cached Team", 1, string.Empty, "#111111"),
            ],
            [
                new ConstructorStandingDocument(1, "Cached Team", 1, "#111111", string.Empty),
            ],
            "cached"));
        var syncService = new StandingsSyncService(
            repository,
            new StubDriverRepository(
            [
                new DriverDocument("pia", "Oscar Piastri", "McLaren", "#FF8700", "https://media.example.com/pia.webp", null),
            ]),
            new StubStandingsSourceClient(
                ReadFixture("tests", "fixtures", "formula1-standings-drivers.html"),
                ReadFixture("tests", "fixtures", "formula1-standings-constructors.html")),
            new OfficialStandingsParser(),
            new StubClock(new DateTimeOffset(2026, 03, 13, 10, 30, 00, TimeSpan.Zero)));

        var validResult = await syncService.SyncAsync(CancellationToken.None);

        Assert.Equal("2026-03-13T10:30:00.0000000+00:00", validResult.UpdatedAt);
        Assert.Equal(validResult, repository.LastWrittenDocument);
        var cachedDocument = new StandingsDocument(
        [
            new DriverStandingDocument(1, "cached", "Cached Driver", "Cached Team", 1, string.Empty, "#111111"),
        ],
        [
            new ConstructorStandingDocument(1, "Cached Team", 1, "#111111", string.Empty),
        ],
        "cached");

        var writeFailureResult = await new StandingsSyncService(
            new StubStandingsRepository(
                currentDocument: cachedDocument,
                writeException: new InvalidOperationException("write failed")),
            new StubDriverRepository(
            [
                new DriverDocument("pia", "Oscar Piastri", "McLaren", "#FF8700", "https://media.example.com/pia.webp", null),
            ]),
            new StubStandingsSourceClient(
                ReadFixture("tests", "fixtures", "formula1-standings-drivers.html"),
                ReadFixture("tests", "fixtures", "formula1-standings-constructors.html")),
            new OfficialStandingsParser(),
            new StubClock(new DateTimeOffset(2026, 03, 13, 10, 45, 00, TimeSpan.Zero)))
            .SyncAsync(CancellationToken.None);

        Assert.Equal("2026-03-13T10:45:00.0000000+00:00", writeFailureResult.UpdatedAt);

        var fallbackResult = await new StandingsSyncService(
            repository,
            new StubDriverRepository([]),
            new StubStandingsSourceClient("<table><tbody></tbody></table>", ReadFixture("tests", "fixtures", "formula1-standings-constructors.html")),
            new OfficialStandingsParser(),
            new StubClock(new DateTimeOffset(2026, 03, 13, 11, 00, 00, TimeSpan.Zero)))
            .SyncAsync(CancellationToken.None);

        Assert.Equal("cached", fallbackResult.UpdatedAt);
    }

    [Fact]
    public void Official_standings_parser_matches_the_node_fixture_behavior()
    {
        var parser = new OfficialStandingsParser();
        var driverStandings = parser.ParseDriverStandings(
            ReadFixture("tests", "fixtures", "formula1-standings-drivers.html"),
            [
                new DriverDocument("pia", "Oscar Piastri", "McLaren", "#FF8700", "https://media.example.com/pia.webp", null),
                new DriverDocument("nor", "Lando Norris", "McLaren", "#FF8700", "https://media.example.com/nor.webp", null),
            ]);
        var constructorStandings = parser.ParseConstructorStandings(
            ReadFixture("tests", "fixtures", "formula1-standings-constructors.html"));

        Assert.Equal(
            [
                "Oscar Piastri",
                "Lando Norris",
                "Charles Leclerc",
            ],
            driverStandings.Select(entry => entry.Name).ToArray());
        Assert.Equal(
            [
                "McLaren",
                "Ferrari",
                "Red Bull",
            ],
            constructorStandings.Select(entry => entry.Team).ToArray());
        Assert.Equal("https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/mclaren/2025mclarenlogowhite.webp", constructorStandings[0].LogoUrl);
    }

    [Fact]
    public void Official_standings_parser_handles_blank_payloads_and_unknown_reference_data()
    {
        var parser = new OfficialStandingsParser();
        var normalizeText = typeof(OfficialStandingsParser)
            .GetMethod("NormalizeText", BindingFlags.Static | BindingFlags.NonPublic)!;

        var emptyDriverStandings = parser.ParseDriverStandings("   ", []);
        var driverStandings = parser.ParseDriverStandings(
            "<table><tbody><tr><td>1</td><td>Unknown Driver XYZ</td><td>Unknown Team</td><td>10</td></tr></tbody></table>",
            []);
        var constructorStandings = parser.ParseConstructorStandings(
            "<table><tbody><tr><td>1</td><td>Unknown Team</td><td>20</td></tr></tbody></table>");
        var normalizedNullText = (string)normalizeText.Invoke(null, [null])!;

        Assert.Empty(emptyDriverStandings);
        Assert.Equal(string.Empty, normalizedNullText);
        Assert.Single(driverStandings);
        Assert.Equal(string.Empty, driverStandings[0].DriverId);
        Assert.Equal("Unknown Driver", driverStandings[0].Name);
        Assert.Equal("Unknown Team", driverStandings[0].Team);
        Assert.Equal(OfficialStandingsReferenceData.TeamColors["default"], driverStandings[0].Color);
        Assert.Single(constructorStandings);
        Assert.Equal(OfficialStandingsReferenceData.TeamColors["default"], constructorStandings[0].Color);
        Assert.Equal(string.Empty, constructorStandings[0].LogoUrl);
    }

    private static string ReadFixture(params string[] segments)
    {
        return File.ReadAllText(GetRepositoryPath(segments), Encoding.UTF8);
    }

    private static string GetRepositoryPath(params string[] segments)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "AGENTS.md")))
        {
            directory = directory.Parent;
        }

        var repositoryRoot = directory?.FullName
            ?? throw new DirectoryNotFoundException("Repository root not found from the current test base directory.");

        return Path.Combine([repositoryRoot, .. segments]);
    }

    private sealed class StubStandingsRepository : IStandingsRepository
    {
        private readonly StandingsDocument _currentDocument;
        private readonly Exception? _writeException;

        public StubStandingsRepository(StandingsDocument? currentDocument = null, Exception? writeException = null)
        {
            _currentDocument = currentDocument ?? new StandingsDocument([], [], string.Empty);
            _writeException = writeException;
        }

        public StandingsDocument? LastWrittenDocument { get; private set; }

        public Task<StandingsDocument?> GetByIdAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task<IReadOnlyList<StandingsDocument>> GetAllAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task AddAsync(StandingsDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task UpdateAsync(StandingsDocument entity, CancellationToken cancellationToken) => throw new NotImplementedException();
        public Task DeleteAsync(string id, CancellationToken cancellationToken) => throw new NotImplementedException();

        public Task<StandingsDocument> ReadCurrentAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_currentDocument);
        }

        public Task WriteCurrentAsync(StandingsDocument document, CancellationToken cancellationToken)
        {
            if (_writeException is not null)
            {
                throw _writeException;
            }

            LastWrittenDocument = document;
            return Task.CompletedTask;
        }
    }

    private sealed class StubDriverRepository : IDriverRepository
    {
        private readonly IReadOnlyList<DriverDocument> _drivers;

        public StubDriverRepository(IReadOnlyList<DriverDocument>? drivers = null)
        {
            _drivers = drivers ?? [];
        }

        public Task<IReadOnlyList<DriverDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_drivers);
        }

        public Task WriteAllAsync(IReadOnlyList<DriverDocument> drivers, CancellationToken cancellationToken)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class StubStandingsSourceClient : IStandingsSourceClient
    {
        private readonly string _driverHtml;
        private readonly string _constructorHtml;

        public StubStandingsSourceClient(string driverHtml = "", string constructorHtml = "")
        {
            _driverHtml = driverHtml;
            _constructorHtml = constructorHtml;
        }

        public Task<string> FetchDriverStandingsHtmlAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_driverHtml);
        }

        public Task<string> FetchConstructorStandingsHtmlAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_constructorHtml);
        }
    }

    private sealed class StubStandingsSyncService : IStandingsSyncService
    {
        private readonly StandingsDocument _document;

        public StubStandingsSyncService(StandingsDocument document)
        {
            _document = document;
        }

        public bool WasCalled { get; private set; }

        public Task<StandingsDocument> SyncAsync(CancellationToken cancellationToken)
        {
            WasCalled = true;
            return Task.FromResult(_document);
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
}
