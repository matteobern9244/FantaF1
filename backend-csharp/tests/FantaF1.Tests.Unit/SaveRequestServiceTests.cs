using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Application.Services;
using System.Text;
using System.Text.Json;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.SaveValidation;
namespace FantaF1.Tests.Unit;

public sealed class SaveRequestServiceTests
{
    [Theory]
    [InlineData("runtimeEnvironmentProfileResolver")]
    [InlineData("appDataRepository")]
    [InlineData("weekendRepository")]
    [InlineData("clock")]
    [InlineData("adminSessionCookieInspector")]
    [InlineData("requestIdGenerator")]
    [InlineData("appDataSanitizer")]
    [InlineData("participantRosterValidator")]
    [InlineData("predictionCompletenessValidator")]
    [InlineData("raceLockValidator")]
    public void Constructor_throws_when_required_dependencies_are_missing(string parameterName)
    {
        var exception = Assert.Throws<ArgumentNullException>(() => CreateServiceWithNullDependency(parameterName));

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task Save_data_async_returns_participants_invalid_before_attempting_persistence()
    {
        var repository = new StubAppDataRepository();
        var service = CreateService(repository);

        var outcome = await service.SaveDataAsync(
            new AppDataDocument(
                Users: [],
                History: [],
                GpName: string.Empty,
                RaceResults: new PredictionDocument("", "", "", ""),
                SelectedMeetingKey: "race-1",
                WeekendStateByMeetingKey: null),
            cookieHeader: null,
            CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.BadRequestStatusCode, errorOutcome.StatusCode);
        Assert.Equal(SaveRouteContract.ParticipantsInvalidCode, errorOutcome.Payload.Code);
        Assert.False(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_returns_unknown_received_count_when_the_request_body_is_missing()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"]);
        var service = CreateService(repository);

        var outcome = await service.SaveDataAsync(null, null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal("Expected 3 participants, received unknown.", errorOutcome.Payload.Details);
        Assert.Equal("req-test", errorOutcome.Payload.RequestId);
        Assert.False(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_returns_unknown_received_count_when_the_users_collection_is_missing()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"]);
        var service = CreateService(repository);

        var outcome = await service.SaveDataAsync(
            new AppDataDocument(
                Users: null,
                History: [],
                GpName: "Race 1",
                RaceResults: new PredictionDocument("", "", "", ""),
                SelectedMeetingKey: "race-1",
                WeekendStateByMeetingKey: null),
            null,
            CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal("Expected 3 participants, received unknown.", errorOutcome.Payload.Details);
        Assert.False(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_predictions_async_rejects_a_payload_with_no_predictions()
    {
        var repository = new StubAppDataRepository();
        var service = CreateService(repository);

        var outcome = await service.SavePredictionsAsync(CreatePayload(), null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.BadRequestStatusCode, errorOutcome.StatusCode);
        Assert.Equal(SaveRouteContract.PredictionsMissingCode, errorOutcome.Payload.Code);
        Assert.False(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_predictions_async_keeps_the_race_lock_active_after_the_start_time()
    {
        var repository = new StubAppDataRepository(
            persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"],
            latestDocument: CreatePayload("ham"));
        var service = CreateService(
            repository,
            weekends:
            [
                new WeekendDocument(
                    "race-1",
                    "Race 1",
                    "Race 1",
                    1,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "2026-03-01",
                    "2026-03-01",
                    "2026-03-01T14:00:00Z",
                    [],
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty),
            ],
            now: new DateTimeOffset(2026, 03, 01, 19, 00, 00, TimeSpan.Zero));

        var outcome = await service.SavePredictionsAsync(CreatePayload("ver"), null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.ForbiddenStatusCode, errorOutcome.StatusCode);
        Assert.Equal(SaveRouteContract.RaceLockedCode, errorOutcome.Payload.Code);
        Assert.False(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_accepts_the_first_valid_roster_and_writes_the_sanitized_payload()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: null);
        var service = CreateService(repository);
        var payload = CreatePayload("ver");

        var outcome = await service.SaveDataAsync(payload, null, CancellationToken.None);

        var successOutcome = Assert.IsType<SaveSuccessOutcome>(outcome);
        Assert.Equal(SaveRouteContract.SaveSuccessMessage, successOutcome.Payload.Message);
        Assert.True(repository.WriteCalled);
        Assert.NotNull(repository.WrittenDocument);
        Assert.Equal("ver", repository.WrittenDocument!.WeekendStateByMeetingKey!["race-1"].UserPredictions!["Adriano"].First);
    }

    [Fact]
    public async Task Save_data_async_allows_an_active_admin_session_in_staging()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: null);
        var now = new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero);
        var service = CreateService(
            repository,
            environment: "staging",
            databaseTarget: "fantaf1_porting",
            now: now);

        var outcome = await service.SaveDataAsync(
            CreatePayload(),
            CreateAdminCookieHeader(now - TimeSpan.FromHours(1)),
            CancellationToken.None);

        Assert.IsType<SaveSuccessOutcome>(outcome);
        Assert.True(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_writes_successfully_when_the_selected_meeting_key_is_missing_from_the_payload()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"]);
        var service = CreateService(
            repository,
            weekends:
            [
                new WeekendDocument(
                    "race-1",
                    "Race 1",
                    "Race 1",
                    1,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "2026-03-01",
                    "2026-03-01",
                    "2026-03-01T14:00:00Z",
                    [],
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty),
            ]);

        var outcome = await service.SaveDataAsync(
            CreatePayload() with { SelectedMeetingKey = null },
            null,
            CancellationToken.None);

        Assert.IsType<SaveSuccessOutcome>(outcome);
        Assert.True(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_requires_admin_authentication_in_staging()
    {
        var repository = new StubAppDataRepository();
        var service = CreateService(
            repository,
            environment: "staging",
            databaseTarget: "fantaf1_porting");

        var outcome = await service.SaveDataAsync(CreatePayload(), null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.UnauthorizedStatusCode, errorOutcome.StatusCode);
        Assert.Equal(SaveRouteContract.AdminAuthRequiredCode, errorOutcome.Payload.Code);
        Assert.Null(errorOutcome.Payload.RequestId);
        Assert.False(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_returns_the_generic_save_error_payload_when_persistence_fails()
    {
        var repository = new StubAppDataRepository(writeException: new InvalidOperationException("mongo write failed"));
        var service = CreateService(repository);

        var outcome = await service.SaveDataAsync(CreatePayload(), null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.InternalServerErrorStatusCode, errorOutcome.StatusCode);
        Assert.Equal(SaveRouteContract.StorageWriteFailedCode, errorOutcome.Payload.Code);
        Assert.Equal("req-test", errorOutcome.Payload.RequestId);
        Assert.Contains("mongo write failed", errorOutcome.Payload.Details!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Save_data_async_returns_a_database_target_mismatch_payload_when_the_profile_resolution_fails()
    {
        var service = new SaveRequestService(
            new ThrowingRuntimeEnvironmentProfileResolver(new InvalidOperationException("MONGODB_URI targets \"fantaf1\" but development requires \"fantaf1_porting\".")),
            new StubAppDataRepository(),
            new StubWeekendRepository([]),
            new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)),
            new AdminSessionCookieInspector(new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero)), new StubSignedCookieService()),
            new StubRequestIdGenerator(),
            new AppDataSanitizer(),
            new ParticipantRosterValidator(),
            new PredictionCompletenessValidator(),
            new RaceLockValidator());

        var outcome = await service.SaveDataAsync(CreatePayload(), null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.DatabaseTargetMismatchCode, errorOutcome.Payload.Code);
    }

    [Fact]
    public async Task Save_data_async_falls_back_to_an_empty_calendar_and_default_current_data_when_reads_fail()
    {
        var repository = new StubAppDataRepository(
            persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"],
            latestReadException: new InvalidOperationException("read failed"));
        var service = CreateService(
            repository,
            weekendsException: new InvalidOperationException("calendar failed"));

        var outcome = await service.SaveDataAsync(CreatePayload("ver"), null, CancellationToken.None);

        Assert.IsType<SaveSuccessOutcome>(outcome);
        Assert.True(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_uses_default_current_data_when_the_latest_snapshot_read_fails_for_a_matching_race()
    {
        var repository = new StubAppDataRepository(
            persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"],
            latestReadException: new InvalidOperationException("read failed"));
        var service = CreateService(
            repository,
            weekends:
            [
                new WeekendDocument(
                    "race-1",
                    "Race 1",
                    "Race 1",
                    1,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "2026-03-01",
                    "2026-03-01",
                    "2026-03-01T14:00:00Z",
                    [],
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty),
            ],
            now: new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero));
        var payload = CreatePayload(string.Empty);

        var outcome = await service.SaveDataAsync(payload, null, CancellationToken.None);

        Assert.IsType<SaveSuccessOutcome>(outcome);
        Assert.True(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_returns_a_race_lock_error_when_the_start_time_string_is_empty_but_the_end_date_fallback_applies()
    {
        var repository = new StubAppDataRepository(
            persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"],
            latestDocument: CreatePayload("ham"));
        var service = CreateService(
            repository,
            weekends:
            [
                new WeekendDocument(
                    "race-1",
                    "Race 1",
                    "Race 1",
                    1,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "2026-03-01",
                    "2026-03-01",
                    string.Empty,
                    [],
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty),
            ],
            now: new DateTimeOffset(2026, 03, 01, 14, 00, 00, TimeSpan.Zero));

        var outcome = await service.SaveDataAsync(CreatePayload("ver"), null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.RaceLockedCode, errorOutcome.Payload.Code);
        Assert.Contains("started at  and", errorOutcome.Payload.Details!, StringComparison.Ordinal);
        Assert.False(repository.WriteCalled);
    }

    [Fact]
    public void Resolve_race_locked_start_time_details_supports_all_node_compatible_fallbacks()
    {
        var method = typeof(SaveRequestService).GetMethod(
            "ResolveRaceLockedStartTimeDetails",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;

        var explicitStartTime = (string)method.Invoke(null, [new WeekendDocument(
            "race-1",
            "Race 1",
            "Race 1",
            1,
            null,
            null,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty)])!;
        var endDateFallback = (string)method.Invoke(null, [new WeekendDocument(
            "race-1",
            "Race 1",
            "Race 1",
            1,
            null,
            null,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            null,
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty)])!;
        var unknownFallback = (string)method.Invoke(null, [new WeekendDocument(
            "race-1",
            "Race 1",
            "Race 1",
            1,
            null,
            null,
            null,
            null,
            false,
            "2026-03-01",
            null,
            null,
            [],
            string.Empty,
            string.Empty,
            string.Empty,
            string.Empty)])!;

        Assert.Equal("2026-03-01T14:00:00Z", explicitStartTime);
        Assert.Equal("2026-03-01", endDateFallback);
        Assert.Equal("unknown", unknownFallback);
    }

    [Fact]
    public async Task Save_predictions_async_accepts_the_selected_weekend_prediction_map()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"]);
        var service = CreateService(repository);
        var payload = new AppDataDocument(
            Users:
            [
                new AppDataUserDocument("Adriano", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
                new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
            ],
            History: [],
            GpName: "Race 1",
            RaceResults: new PredictionDocument("", "", "", ""),
            SelectedMeetingKey: "race-1",
            WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
            {
                ["race-1"] = new(
                    new Dictionary<string, PredictionDocument>
                    {
                        ["Adriano"] = new("ver", "", "", ""),
                        ["Fabio"] = new("", "", "", ""),
                        ["Matteo"] = new("", "", "", ""),
                    },
                    new PredictionDocument("", "", "", "")),
            });

        var outcome = await service.SavePredictionsAsync(payload, null, CancellationToken.None);

        Assert.IsType<SaveSuccessOutcome>(outcome);
    }

    [Fact]
    public async Task Save_predictions_async_accepts_complete_predictions_when_the_selected_race_exists()
    {
        var repository = new StubAppDataRepository(persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"]);
        var service = CreateService(
            repository,
            weekends:
            [
                new WeekendDocument(
                    "race-1",
                    "Race 1",
                    "Race 1",
                    1,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "2026-03-01",
                    "2026-03-01",
                    "2026-03-02T14:00:00Z",
                    [],
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty),
            ],
            now: new DateTimeOffset(2026, 03, 01, 15, 00, 00, TimeSpan.Zero));

        var outcome = await service.SavePredictionsAsync(
            new AppDataDocument(
                Users:
                [
                    new AppDataUserDocument("Adriano", new PredictionDocument("", "", "", ""), 0),
                    new AppDataUserDocument("Fabio", new PredictionDocument("", "", "", ""), 0),
                    new AppDataUserDocument("Matteo", new PredictionDocument("", "", "", ""), 0),
                ],
                History: [],
                GpName: "Race 1",
                RaceResults: new PredictionDocument("", "", "", ""),
                SelectedMeetingKey: "race-1",
                WeekendStateByMeetingKey: new Dictionary<string, WeekendPredictionStateDocument>
                {
                    ["race-1"] = new(
                        new Dictionary<string, PredictionDocument>
                        {
                            ["Adriano"] = new("ver", "", "", ""),
                            ["Fabio"] = new("", "", "", ""),
                            ["Matteo"] = new("", "", "", ""),
                        },
                        new PredictionDocument("", "", "", "")),
                }),
            null,
            CancellationToken.None);

        Assert.IsType<SaveSuccessOutcome>(outcome);
        Assert.True(repository.WriteCalled);
    }

    [Fact]
    public async Task Save_data_async_returns_a_race_lock_error_using_the_end_date_when_the_start_time_is_missing()
    {
        var repository = new StubAppDataRepository(
            persistedParticipantRoster: ["Adriano", "Fabio", "Matteo"],
            latestDocument: CreatePayload("ham"));
        var service = CreateService(
            repository,
            weekends:
            [
                new WeekendDocument(
                    "race-1",
                    "Race 1",
                    "Race 1",
                    1,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "2026-03-01",
                    "2026-03-01",
                    null,
                    [],
                    string.Empty,
                    string.Empty,
                    string.Empty,
                    string.Empty),
            ],
            now: new DateTimeOffset(2026, 03, 01, 14, 00, 00, TimeSpan.Zero));

        var outcome = await service.SaveDataAsync(CreatePayload("ver"), null, CancellationToken.None);

        var errorOutcome = Assert.IsType<SaveErrorOutcome>(outcome);
        Assert.Equal(SaveRouteContract.RaceLockedCode, errorOutcome.Payload.Code);
        Assert.Contains("2026-03-01", errorOutcome.Payload.Details!, StringComparison.Ordinal);
        Assert.False(repository.WriteCalled);
    }

    private static SaveRequestService CreateService(
        StubAppDataRepository repository,
        IReadOnlyList<WeekendDocument>? weekends = null,
        Exception? weekendsException = null,
        DateTimeOffset? now = null,
        string environment = "development",
        string databaseTarget = "fantaf1_porting")
    {
        var clock = new StubClock(now ?? new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));

        return new SaveRequestService(
            new StubRuntimeEnvironmentProfileResolver(environment, databaseTarget),
            repository,
            new StubWeekendRepository(weekends, weekendsException),
            clock,
            new AdminSessionCookieInspector(
                clock,
                new StubSignedCookieService()),
            new StubRequestIdGenerator(),
            new AppDataSanitizer(),
            new ParticipantRosterValidator(),
            new PredictionCompletenessValidator(),
            new RaceLockValidator());
    }

    private static SaveRequestService CreateServiceWithNullDependency(string parameterName)
    {
        var clock = new StubClock(new DateTimeOffset(2026, 03, 12, 09, 30, 00, TimeSpan.Zero));
        var inspector = new AdminSessionCookieInspector(clock, new StubSignedCookieService());
        var environmentResolver = new StubRuntimeEnvironmentProfileResolver("development", "fantaf1_porting");
        var repository = new StubAppDataRepository();
        var weekendRepository = new StubWeekendRepository([]);
        var requestIdGenerator = new StubRequestIdGenerator();
        var sanitizer = new AppDataSanitizer();
        var participantRosterValidator = new ParticipantRosterValidator();
        var predictionCompletenessValidator = new PredictionCompletenessValidator();
        var raceLockValidator = new RaceLockValidator();

        return parameterName switch
        {
            "runtimeEnvironmentProfileResolver" => new SaveRequestService(
                null!,
                repository,
                weekendRepository,
                clock,
                inspector,
                requestIdGenerator,
                sanitizer,
                participantRosterValidator,
                predictionCompletenessValidator,
                raceLockValidator),
            "appDataRepository" => new SaveRequestService(
                environmentResolver,
                null!,
                weekendRepository,
                clock,
                inspector,
                requestIdGenerator,
                sanitizer,
                participantRosterValidator,
                predictionCompletenessValidator,
                raceLockValidator),
            "weekendRepository" => new SaveRequestService(
                environmentResolver,
                repository,
                null!,
                clock,
                inspector,
                requestIdGenerator,
                sanitizer,
                participantRosterValidator,
                predictionCompletenessValidator,
                raceLockValidator),
            "clock" => new SaveRequestService(
                environmentResolver,
                repository,
                weekendRepository,
                null!,
                inspector,
                requestIdGenerator,
                sanitizer,
                participantRosterValidator,
                predictionCompletenessValidator,
                raceLockValidator),
            "adminSessionCookieInspector" => new SaveRequestService(
                environmentResolver,
                repository,
                weekendRepository,
                clock,
                null!,
                requestIdGenerator,
                sanitizer,
                participantRosterValidator,
                predictionCompletenessValidator,
                raceLockValidator),
            "requestIdGenerator" => new SaveRequestService(
                environmentResolver,
                repository,
                weekendRepository,
                clock,
                inspector,
                null!,
                sanitizer,
                participantRosterValidator,
                predictionCompletenessValidator,
                raceLockValidator),
            "appDataSanitizer" => new SaveRequestService(
                environmentResolver,
                repository,
                weekendRepository,
                clock,
                inspector,
                requestIdGenerator,
                null!,
                participantRosterValidator,
                predictionCompletenessValidator,
                raceLockValidator),
            "participantRosterValidator" => new SaveRequestService(
                environmentResolver,
                repository,
                weekendRepository,
                clock,
                inspector,
                requestIdGenerator,
                sanitizer,
                null!,
                predictionCompletenessValidator,
                raceLockValidator),
            "predictionCompletenessValidator" => new SaveRequestService(
                environmentResolver,
                repository,
                weekendRepository,
                clock,
                inspector,
                requestIdGenerator,
                sanitizer,
                participantRosterValidator,
                null!,
                raceLockValidator),
            "raceLockValidator" => new SaveRequestService(
                environmentResolver,
                repository,
                weekendRepository,
                clock,
                inspector,
                requestIdGenerator,
                sanitizer,
                participantRosterValidator,
                predictionCompletenessValidator,
                null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName)),
        };
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

    private static string CreateAdminCookieHeader(DateTimeOffset issuedAt)
    {
        var payload = JsonSerializer.Serialize(new
        {
            role = AdminSessionContract.AdminRole,
            issuedAt = issuedAt.ToUnixTimeMilliseconds(),
        });
        var encodedPayload = Convert.ToBase64String(Encoding.UTF8.GetBytes(payload))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

        return $"{AdminSessionContract.CookieName}={encodedPayload}";
    }

    private sealed class StubAppDataRepository : IAppDataRepository
    {
        private readonly Exception? _writeException;
        private readonly AppDataDocument? _latestDocument;
        private readonly IReadOnlyList<string>? _persistedParticipantRoster;
        private readonly Exception? _latestReadException;

        public StubAppDataRepository(
            IReadOnlyList<string>? persistedParticipantRoster = null,
            AppDataDocument? latestDocument = null,
            Exception? writeException = null,
            Exception? latestReadException = null)
        {
            _persistedParticipantRoster = persistedParticipantRoster;
            _latestDocument = latestDocument;
            _writeException = writeException;
            _latestReadException = latestReadException;
        }

        public bool WriteCalled { get; private set; }

        public AppDataDocument? WrittenDocument { get; private set; }

        public Task<AppDataDocument?> ReadLatestAsync(CancellationToken cancellationToken)
        {
            if (_latestReadException is not null)
            {
                throw _latestReadException;
            }

            return Task.FromResult(_latestDocument);
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

            WrittenDocument = document;
            return Task.CompletedTask;
        }
    }

    private sealed class StubWeekendRepository : IWeekendRepository
    {
        private readonly IReadOnlyList<WeekendDocument> _weekends;
        private readonly Exception? _exception;

        public StubWeekendRepository(IReadOnlyList<WeekendDocument>? weekends, Exception? exception = null)
        {
            _weekends = weekends ?? [];
            _exception = exception;
        }

        public Task<IReadOnlyList<WeekendDocument>> ReadAllAsync(CancellationToken cancellationToken)
        {
            if (_exception is not null)
            {
                throw _exception;
            }

            return Task.FromResult(_weekends);
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

    private sealed class StubRuntimeEnvironmentProfileResolver : IRuntimeEnvironmentProfileResolver
    {
        private readonly RuntimeEnvironmentProfile _profile;

        public StubRuntimeEnvironmentProfileResolver(string environment, string databaseTarget)
        {
            _profile = new RuntimeEnvironmentProfile(environment, databaseTarget);
        }

        public RuntimeEnvironmentProfile ResolveCurrentProfile()
        {
            return _profile;
        }
    }

    private sealed class ThrowingRuntimeEnvironmentProfileResolver : IRuntimeEnvironmentProfileResolver
    {
        private readonly Exception _exception;

        public ThrowingRuntimeEnvironmentProfileResolver(Exception exception)
        {
            _exception = exception;
        }

        public RuntimeEnvironmentProfile ResolveCurrentProfile()
        {
            throw _exception;
        }
    }

    private sealed class StubSignedCookieService : ISignedCookieService
    {
        public string Sign(string value)
        {
            return value;
        }

        public bool TryVerify(string signedValue, out string? unsignedValue)
        {
            unsignedValue = signedValue;
            return true;
        }
    }

    private sealed class StubRequestIdGenerator : IRequestIdGenerator
    {
        public string Generate()
        {
            return "req-test";
        }
    }
}
