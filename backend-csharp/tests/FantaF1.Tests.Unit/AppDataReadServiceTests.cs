using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Tests.Unit;

public sealed class AppDataReadServiceTests
{
    [Fact]
    public void App_data_read_service_rejects_null_dependencies()
    {
        var repository = new StubAppDataRepository();
        var weekendRepository = new StubWeekendRepository([]);
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        Assert.Throws<ArgumentNullException>(() => new AppDataReadService(
            null!,
            weekendRepository,
            clock,
            new AppDataSanitizer()));
        Assert.Throws<ArgumentNullException>(() => new AppDataReadService(
            repository,
            null!,
            clock,
            new AppDataSanitizer()));
        Assert.Throws<ArgumentNullException>(() => new AppDataReadService(
            repository,
            weekendRepository,
            null!,
            new AppDataSanitizer()));
        Assert.Throws<ArgumentNullException>(() => new AppDataReadService(
            repository,
            weekendRepository,
            clock,
            null!));
    }

    [Fact]
    public async Task Read_async_returns_a_sanitized_payload_and_prefers_the_persisted_selected_weekend_state()
    {
        var service = new AppDataReadService(
            new StubAppDataRepository(new AppDataDocument(
                Users:
                [
                    new AppDataUserDocument(string.Empty, new PredictionDocument("legacy", null, null, null), double.NaN),
                    new AppDataUserDocument("Valid User", new PredictionDocument("ver", string.Empty, string.Empty, string.Empty), 7),
                ],
                History:
                [
                    new AppDataHistoryRecordDocument(
                        "Historic GP",
                        "historic",
                        "01/01/2026",
                        new PredictionDocument("ver", "ham", "lec", "nor"),
                        new Dictionary<string, AppDataHistoryUserPredictionDocument>
                        {
                            ["Player 1"] = new(new PredictionDocument("ver", "ham", "lec", "nor"), double.NaN),
                        })
                ],
                GpName: "Monaco Grand Prix",
                RaceResults: new PredictionDocument("legacy", null, null, null),
                SelectedMeetingKey: "missing",
                WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
                {
                    ["monaco"] = new(
                        new Dictionary<string, PredictionDocument>
                        {
                            ["Unknown"] = new("ver", string.Empty, string.Empty, string.Empty),
                            ["Valid User"] = new(string.Empty, string.Empty, string.Empty, string.Empty),
                            ["Player 3"] = new(string.Empty, string.Empty, string.Empty, string.Empty),
                        },
                        new PredictionDocument(string.Empty, string.Empty, string.Empty, "pia")),
                })),
            new StubWeekendRepository(
            [
                new WeekendDocument(
                    MeetingKey: "monaco",
                    MeetingName: "Monaco",
                    GrandPrixTitle: "Monaco Grand Prix",
                    RoundNumber: 7,
                    DateRangeLabel: null,
                    DetailUrl: null,
                    HeroImageUrl: null,
                    TrackOutlineUrl: null,
                    IsSprintWeekend: false,
                    StartDate: "2026-05-24",
                    EndDate: "2026-05-24",
                    RaceStartTime: null,
                    Sessions: [],
                    HighlightsVideoUrl: string.Empty,
                    HighlightsLookupCheckedAt: string.Empty,
                    HighlightsLookupStatus: string.Empty,
                    HighlightsLookupSource: string.Empty),
            ]),
            new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)),
            new AppDataSanitizer());

        var payload = await service.ReadAsync(CancellationToken.None);

        Assert.Equal("monaco", payload.SelectedMeetingKey);
        Assert.Equal("Monaco Grand Prix", payload.GpName);
        Assert.Equal(
            ["Unknown", "Valid User", "Player 3"],
            payload.Users.Select(user => user.Name).ToArray());
        Assert.Equal(0, payload.Users[0].Points);
        Assert.Equal("ver", payload.Users[0].Predictions.First);
        Assert.Equal("pia", payload.RaceResults.Pole);
        Assert.Equal(0, payload.History.Single().UserPredictions["Player 1"].PointsEarned);
        Assert.Equal("ver", payload.WeekendStateByMeetingKey["monaco"].UserPredictions["Unknown"].First);
    }

    [Fact]
    public async Task Read_async_returns_default_app_data_when_the_repository_throws_and_uses_the_next_upcoming_meeting()
    {
        var service = new AppDataReadService(
            new StubAppDataRepository(exception: new InvalidOperationException("read failed")),
            new StubWeekendRepository(
            [
                new WeekendDocument(
                    MeetingKey: "past",
                    MeetingName: "Past",
                    GrandPrixTitle: "Past Grand Prix",
                    RoundNumber: 1,
                    DateRangeLabel: null,
                    DetailUrl: null,
                    HeroImageUrl: null,
                    TrackOutlineUrl: null,
                    IsSprintWeekend: false,
                    StartDate: "2026-03-01",
                    EndDate: "2026-03-01",
                    RaceStartTime: null,
                    Sessions: [],
                    HighlightsVideoUrl: string.Empty,
                    HighlightsLookupCheckedAt: string.Empty,
                    HighlightsLookupStatus: string.Empty,
                    HighlightsLookupSource: string.Empty),
                new WeekendDocument(
                    MeetingKey: "future",
                    MeetingName: "Future",
                    GrandPrixTitle: "Future Grand Prix",
                    RoundNumber: 2,
                    DateRangeLabel: null,
                    DetailUrl: null,
                    HeroImageUrl: null,
                    TrackOutlineUrl: null,
                    IsSprintWeekend: false,
                    StartDate: "2026-04-01",
                    EndDate: "2026-04-01",
                    RaceStartTime: null,
                    Sessions: [],
                    HighlightsVideoUrl: string.Empty,
                    HighlightsLookupCheckedAt: string.Empty,
                    HighlightsLookupStatus: string.Empty,
                    HighlightsLookupSource: string.Empty),
            ]),
            new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)),
            new AppDataSanitizer());

        var payload = await service.ReadAsync(CancellationToken.None);

        Assert.Equal("future", payload.SelectedMeetingKey);
        Assert.Equal("Future Grand Prix", payload.GpName);
        Assert.Equal(3, payload.Users.Count);
        Assert.Equal("Player 1", payload.Users[0].Name);
        Assert.Equal("Player 2", payload.Users[1].Name);
        Assert.Equal("Player 3", payload.Users[2].Name);
    }

    [Fact]
    public async Task Read_async_returns_default_app_data_when_no_document_exists_and_falls_back_to_an_empty_calendar_when_calendar_read_fails()
    {
        var service = new AppDataReadService(
            new StubAppDataRepository(document: null),
            new StubWeekendRepository(exception: new InvalidOperationException("calendar failed")),
            new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)),
            new AppDataSanitizer());

        var payload = await service.ReadAsync(CancellationToken.None);

        Assert.Equal(string.Empty, payload.SelectedMeetingKey);
        Assert.Equal(string.Empty, payload.GpName);
        Assert.Empty(payload.History);
        Assert.Empty(payload.WeekendStateByMeetingKey);
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
}
