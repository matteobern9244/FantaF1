using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;

namespace FantaF1.Tests.Contract;

public sealed class SharedAbstractionsContractTests
{
    [Fact]
    public void Required_shared_abstractions_are_public_interfaces()
    {
        var abstractionTypes = new[]
        {
            typeof(IAdminCredentialRepository),
            typeof(IAdminSessionService),
            typeof(IAppDataRepository),
            typeof(IAppDataReadService),
            typeof(IBackgroundSyncService),
            typeof(ICalendarReadService),
            typeof(IClock),
            typeof(IDriverRepository),
            typeof(IDriverReadService),
            typeof(IHealthReportService),
            typeof(IRaceHighlightsLookupService),
            typeof(IRequestIdGenerator),
            typeof(IResultsService),
            typeof(IResultsSourceClient),
            typeof(IRuntimeEnvironmentProfileResolver),
            typeof(ISaveRequestService),
            typeof(ISignedCookieService),
            typeof(IStandingsReadService),
            typeof(IStandingsRepository),
            typeof(IStandingsSourceClient),
            typeof(IStandingsSyncService),
            typeof(IWeekendRepository),
        };

        Assert.Equal(22, abstractionTypes.Length);
        Assert.All(abstractionTypes, type =>
        {
            Assert.True(type.IsInterface);
            Assert.True(type.IsPublic);
        });
    }

    [Fact]
    public void Shared_abstractions_stay_grouped_by_their_technical_seam()
    {
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IAppDataRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IDriverRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IWeekendRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IAdminCredentialRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Persistence", typeof(IStandingsRepository).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IHealthReportService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IAppDataReadService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IDriverReadService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(ICalendarReadService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IRaceHighlightsLookupService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(ISaveRequestService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IAdminSessionService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IResultsService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IResultsSourceClient).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IBackgroundSyncService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IStandingsReadService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IStandingsSourceClient).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.Services", typeof(IStandingsSyncService).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(IClock).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(IRequestIdGenerator).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(IRuntimeEnvironmentProfileResolver).Namespace);
        Assert.Equal("FantaF1.Application.Abstractions.System", typeof(ISignedCookieService).Namespace);
    }

    [Fact]
    public void Admin_session_and_credential_abstractions_expose_the_subphase_four_contract_shape()
    {
        var ensureDefaultCredentialAsync = typeof(IAdminCredentialRepository).GetMethod(nameof(IAdminCredentialRepository.EnsureDefaultCredentialAsync));
        var verifyPasswordAsync = typeof(IAdminCredentialRepository).GetMethod(nameof(IAdminCredentialRepository.VerifyPasswordAsync));
        var getSessionAsync = typeof(IAdminSessionService).GetMethod(nameof(IAdminSessionService.GetSessionAsync));
        var loginAsync = typeof(IAdminSessionService).GetMethod(nameof(IAdminSessionService.LoginAsync));
        var logout = typeof(IAdminSessionService).GetMethod(nameof(IAdminSessionService.Logout));

        Assert.NotNull(ensureDefaultCredentialAsync);
        Assert.Equal(typeof(Task), ensureDefaultCredentialAsync.ReturnType);

        Assert.NotNull(verifyPasswordAsync);
        Assert.Equal(typeof(Task<bool>), verifyPasswordAsync.ReturnType);

        Assert.NotNull(getSessionAsync);
        Assert.Equal(typeof(Task<AdminSessionResponse>), getSessionAsync.ReturnType);

        Assert.NotNull(loginAsync);
        Assert.Equal(typeof(Task<AdminSessionLoginResult>), loginAsync.ReturnType);

        Assert.NotNull(logout);
        Assert.Equal(typeof(AdminSessionCommandResult), logout.ReturnType);
    }

    [Fact]
    public void Read_route_abstractions_expose_the_subphase_five_contract_shape()
    {
        var readLatestAsync = typeof(IAppDataRepository).GetMethod(nameof(IAppDataRepository.ReadLatestAsync));
        var readPersistedParticipantRosterAsync = typeof(IAppDataRepository).GetMethod(nameof(IAppDataRepository.ReadPersistedParticipantRosterAsync));
        var writeAsync = typeof(IAppDataRepository).GetMethod(nameof(IAppDataRepository.WriteAsync));
        var readDriversAsync = typeof(IDriverRepository).GetMethod(nameof(IDriverRepository.ReadAllAsync));
        var writeDriversAsync = typeof(IDriverRepository).GetMethod(nameof(IDriverRepository.WriteAllAsync));
        var readCalendarAsync = typeof(IWeekendRepository).GetMethod(nameof(IWeekendRepository.ReadAllAsync));
        var writeCalendarAsync = typeof(IWeekendRepository).GetMethod(nameof(IWeekendRepository.WriteAllAsync));
        var writeHighlightsLookupAsync = typeof(IWeekendRepository).GetMethod(nameof(IWeekendRepository.WriteHighlightsLookupAsync));
        var readAppDataAsync = typeof(IAppDataReadService).GetMethod(nameof(IAppDataReadService.ReadAsync));
        var readOrderedDriversAsync = typeof(IDriverReadService).GetMethod(nameof(IDriverReadService.ReadAllAsync));
        var readOrderedCalendarAsync = typeof(ICalendarReadService).GetMethod(nameof(ICalendarReadService.ReadAllAsync));

        Assert.NotNull(readLatestAsync);
        Assert.Equal(typeof(Task<AppDataDocument?>), readLatestAsync.ReturnType);

        Assert.NotNull(readPersistedParticipantRosterAsync);
        Assert.Equal(typeof(Task<IReadOnlyList<string>?>), readPersistedParticipantRosterAsync.ReturnType);

        Assert.NotNull(writeAsync);
        Assert.Equal(typeof(Task), writeAsync.ReturnType);

        Assert.NotNull(readDriversAsync);
        Assert.Equal(typeof(Task<IReadOnlyList<DriverDocument>>), readDriversAsync.ReturnType);

        Assert.NotNull(writeDriversAsync);
        Assert.Equal(typeof(Task), writeDriversAsync.ReturnType);

        Assert.NotNull(readCalendarAsync);
        Assert.Equal(typeof(Task<IReadOnlyList<WeekendDocument>>), readCalendarAsync.ReturnType);

        Assert.NotNull(writeCalendarAsync);
        Assert.Equal(typeof(Task), writeCalendarAsync.ReturnType);

        Assert.NotNull(writeHighlightsLookupAsync);
        Assert.Equal(typeof(Task), writeHighlightsLookupAsync.ReturnType);

        Assert.NotNull(readAppDataAsync);
        Assert.Equal(typeof(Task<AppDataDocument>), readAppDataAsync.ReturnType);

        Assert.NotNull(readOrderedDriversAsync);
        Assert.Equal(typeof(Task<IReadOnlyList<DriverDocument>>), readOrderedDriversAsync.ReturnType);

        Assert.NotNull(readOrderedCalendarAsync);
        Assert.Equal(typeof(Task<IReadOnlyList<WeekendDocument>>), readOrderedCalendarAsync.ReturnType);
    }

    [Fact]
    public void Standings_abstractions_expose_the_subphase_six_a_contract_shape()
    {
        var readCurrentStandingsAsync = typeof(IStandingsRepository).GetMethod(nameof(IStandingsRepository.ReadCurrentAsync));
        var writeCurrentStandingsAsync = typeof(IStandingsRepository).GetMethod(nameof(IStandingsRepository.WriteCurrentAsync));
        var runBackgroundSyncAsync = typeof(IBackgroundSyncService).GetMethod(nameof(IBackgroundSyncService.RunAsync));
        var readStandingsAsync = typeof(IStandingsReadService).GetMethod(nameof(IStandingsReadService.ReadAsync));
        var syncStandingsAsync = typeof(IStandingsSyncService).GetMethod(nameof(IStandingsSyncService.SyncAsync));
        var fetchDriverStandingsHtmlAsync = typeof(IStandingsSourceClient).GetMethod(nameof(IStandingsSourceClient.FetchDriverStandingsHtmlAsync));
        var fetchConstructorStandingsHtmlAsync = typeof(IStandingsSourceClient).GetMethod(nameof(IStandingsSourceClient.FetchConstructorStandingsHtmlAsync));

        Assert.NotNull(runBackgroundSyncAsync);
        Assert.Equal(typeof(Task), runBackgroundSyncAsync.ReturnType);

        Assert.NotNull(readCurrentStandingsAsync);
        Assert.Equal(typeof(Task<StandingsDocument>), readCurrentStandingsAsync.ReturnType);

        Assert.NotNull(writeCurrentStandingsAsync);
        Assert.Equal(typeof(Task), writeCurrentStandingsAsync.ReturnType);

        Assert.NotNull(readStandingsAsync);
        Assert.Equal(typeof(Task<StandingsDocument>), readStandingsAsync.ReturnType);

        Assert.NotNull(syncStandingsAsync);
        Assert.Equal(typeof(Task<StandingsDocument>), syncStandingsAsync.ReturnType);

        Assert.NotNull(fetchDriverStandingsHtmlAsync);
        Assert.Equal(typeof(Task<string>), fetchDriverStandingsHtmlAsync.ReturnType);

        Assert.NotNull(fetchConstructorStandingsHtmlAsync);
        Assert.Equal(typeof(Task<string>), fetchConstructorStandingsHtmlAsync.ReturnType);
    }

    [Fact]
    public void Results_abstractions_expose_the_subphase_seven_contract_shape()
    {
        var readResultsAsync = typeof(IResultsService).GetMethod(nameof(IResultsService.ReadAsync));
        var fetchResultsHtmlAsync = typeof(IResultsSourceClient).GetMethod(nameof(IResultsSourceClient.FetchHtmlAsync));
        var shouldLookup = typeof(IRaceHighlightsLookupService).GetMethod(nameof(IRaceHighlightsLookupService.ShouldLookup));
        var resolveLookupAsync = typeof(IRaceHighlightsLookupService).GetMethod(nameof(IRaceHighlightsLookupService.ResolveAsync));

        Assert.NotNull(readResultsAsync);
        Assert.Equal(typeof(Task<OfficialResultsDocument>), readResultsAsync.ReturnType);

        Assert.NotNull(fetchResultsHtmlAsync);
        Assert.Equal(typeof(Task<string>), fetchResultsHtmlAsync.ReturnType);

        Assert.NotNull(shouldLookup);
        Assert.Equal(typeof(bool), shouldLookup.ReturnType);

        Assert.NotNull(resolveLookupAsync);
        Assert.Equal(typeof(Task<HighlightsLookupDocument>), resolveLookupAsync.ReturnType);
    }

    [Fact]
    public void Save_route_abstractions_expose_the_subphase_six_contract_shape()
    {
        var saveDataAsync = typeof(ISaveRequestService).GetMethod(nameof(ISaveRequestService.SaveDataAsync));
        var savePredictionsAsync = typeof(ISaveRequestService).GetMethod(nameof(ISaveRequestService.SavePredictionsAsync));
        var generate = typeof(IRequestIdGenerator).GetMethod(nameof(IRequestIdGenerator.Generate));

        Assert.NotNull(saveDataAsync);
        Assert.Equal(typeof(Task<SaveRequestOutcome>), saveDataAsync.ReturnType);

        Assert.NotNull(savePredictionsAsync);
        Assert.Equal(typeof(Task<SaveRequestOutcome>), savePredictionsAsync.ReturnType);

        Assert.NotNull(generate);
        Assert.Equal(typeof(string), generate.ReturnType);
    }
}
