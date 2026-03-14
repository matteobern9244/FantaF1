using FantaF1.Application.Abstractions.Persistence;
using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.SaveValidation;

namespace FantaF1.Application.Services;

public sealed class SaveRequestService : ISaveRequestService
{
    private readonly IRuntimeEnvironmentProfileResolver _runtimeEnvironmentProfileResolver;
    private readonly IAppDataRepository _appDataRepository;
    private readonly IWeekendRepository _weekendRepository;
    private readonly IClock _clock;
    private readonly AdminSessionCookieInspector _adminSessionCookieInspector;
    private readonly IRequestIdGenerator _requestIdGenerator;
    private readonly AppDataSanitizer _appDataSanitizer;
    private readonly ParticipantRosterValidator _participantRosterValidator;
    private readonly PredictionCompletenessValidator _predictionCompletenessValidator;
    private readonly RaceLockValidator _raceLockValidator;

    public SaveRequestService(
        IRuntimeEnvironmentProfileResolver runtimeEnvironmentProfileResolver,
        IAppDataRepository appDataRepository,
        IWeekendRepository weekendRepository,
        IClock clock,
        AdminSessionCookieInspector adminSessionCookieInspector,
        IRequestIdGenerator requestIdGenerator,
        AppDataSanitizer appDataSanitizer,
        ParticipantRosterValidator participantRosterValidator,
        PredictionCompletenessValidator predictionCompletenessValidator,
        RaceLockValidator raceLockValidator)
    {
        _runtimeEnvironmentProfileResolver = runtimeEnvironmentProfileResolver ?? throw new ArgumentNullException(nameof(runtimeEnvironmentProfileResolver));
        _appDataRepository = appDataRepository ?? throw new ArgumentNullException(nameof(appDataRepository));
        _weekendRepository = weekendRepository ?? throw new ArgumentNullException(nameof(weekendRepository));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        _adminSessionCookieInspector = adminSessionCookieInspector ?? throw new ArgumentNullException(nameof(adminSessionCookieInspector));
        _requestIdGenerator = requestIdGenerator ?? throw new ArgumentNullException(nameof(requestIdGenerator));
        _appDataSanitizer = appDataSanitizer ?? throw new ArgumentNullException(nameof(appDataSanitizer));
        _participantRosterValidator = participantRosterValidator ?? throw new ArgumentNullException(nameof(participantRosterValidator));
        _predictionCompletenessValidator = predictionCompletenessValidator ?? throw new ArgumentNullException(nameof(predictionCompletenessValidator));
        _raceLockValidator = raceLockValidator ?? throw new ArgumentNullException(nameof(raceLockValidator));
    }

    public Task<SaveRequestOutcome> SaveDataAsync(
        AppDataDocument? requestBody,
        string? cookieHeader,
        CancellationToken cancellationToken)
    {
        return SaveAsync(SaveRouteKind.Data, requestBody, cookieHeader, cancellationToken);
    }

    public Task<SaveRequestOutcome> SavePredictionsAsync(
        AppDataDocument? requestBody,
        string? cookieHeader,
        CancellationToken cancellationToken)
    {
        return SaveAsync(SaveRouteKind.Predictions, requestBody, cookieHeader, cancellationToken);
    }

    private async Task<SaveRequestOutcome> SaveAsync(
        SaveRouteKind routeKind,
        AppDataDocument? requestBody,
        string? cookieHeader,
        CancellationToken cancellationToken)
    {
        var requestId = _requestIdGenerator.Generate();
        var environment = AdminSessionContract.DevelopmentEnvironment;

        try
        {
            var profile = _runtimeEnvironmentProfileResolver.ResolveCurrentProfile();
            environment = profile.Environment;

            if (AdminSessionContract.IsProductionLikeEnvironment(profile.Environment)
                && !_adminSessionCookieInspector.HasActiveAdminSession(cookieHeader))
            {
                return SaveRouteContract.CreateAdminRequiredError();
            }

            var requestUsers = requestBody?.Users;
            var selectedMeetingKey = requestBody?.SelectedMeetingKey;
            var weekendStateByMeetingKey = requestBody?.WeekendStateByMeetingKey;
            var persistedParticipantRoster = await _appDataRepository.ReadPersistedParticipantRosterAsync(cancellationToken);
            if (!_participantRosterValidator.ValidateParticipants(requestUsers, persistedParticipantRoster))
            {
                return SaveRouteContract.CreateValidationError(
                    environment,
                    requestId,
                    SaveRouteContract.ParticipantsInvalidCode,
                    SaveRouteContract.FormatTemplate(
                        SaveRouteContract.ParticipantsInvalidTemplate,
                        ("participantSlots", SaveRouteContract.ParticipantSlots)),
                    SaveRouteContract.FormatTemplate(
                        SaveRouteContract.ParticipantsInvalidDetailsTemplate,
                        ("participantSlots", SaveRouteContract.ParticipantSlots),
                        ("received", requestUsers?.Count.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "unknown")));
            }

            var calendar = await TryReadCalendarAsync(cancellationToken);
            var selectedRace = calendar.FirstOrDefault(race =>
                string.Equals(race.MeetingKey, selectedMeetingKey, StringComparison.Ordinal));

            if (selectedRace is not null)
            {
                var currentData = await TryReadCurrentAppDataAsync(calendar, cancellationToken);
                if (_raceLockValidator.IsRaceLocked(selectedRace, requestBody, currentData, _clock.UtcNow))
                {
                    return SaveRouteContract.CreateValidationError(
                        environment,
                        requestId,
                        SaveRouteContract.RaceLockedCode,
                        SaveRouteContract.RaceLockedError,
                        SaveRouteContract.FormatTemplate(
                            SaveRouteContract.RaceLockedDetailsTemplate,
                            ("meetingKey", selectedRace.MeetingKey),
                            ("startTime", ResolveRaceLockedStartTimeDetails(selectedRace))));
                }
            }

            if (routeKind == SaveRouteKind.Predictions
                && !_predictionCompletenessValidator.ValidatePredictions(
                    requestUsers,
                    SaveRouteContract.PredictionFieldOrder,
                    weekendStateByMeetingKey,
                    selectedMeetingKey))
            {
                return SaveRouteContract.CreateValidationError(
                    environment,
                    requestId,
                    SaveRouteContract.PredictionsMissingCode,
                    SaveRouteContract.MissingPredictionsError,
                    SaveRouteContract.PredictionsMissingDetails);
            }

            var sanitizedPayload = _appDataSanitizer.Sanitize(
                requestBody,
                calendar,
                _clock.UtcNow,
                new AppDataSanitizationOptions(
                    PreferPayloadSelectedWeekend: true,
                    ParticipantRoster: persistedParticipantRoster));

            await _appDataRepository.WriteAsync(sanitizedPayload, cancellationToken);

            return SaveRouteContract.CreateSuccess();
        }
        catch (Exception exception)
        {
            return SaveRouteContract.CreateGenericError(environment, requestId, exception);
        }
    }

    private static string ResolveRaceLockedStartTimeDetails(WeekendDocument selectedRace)
    {
        return selectedRace.RaceStartTime ?? selectedRace.EndDate ?? "unknown";
    }

    private async Task<IReadOnlyList<WeekendDocument>> TryReadCalendarAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await _weekendRepository.ReadAllAsync(cancellationToken);
        }
        catch
        {
            return [];
        }
    }

    private async Task<AppDataDocument> TryReadCurrentAppDataAsync(
        IReadOnlyList<WeekendDocument> calendar,
        CancellationToken cancellationToken)
    {
        try
        {
            var latestDocument = await _appDataRepository.ReadLatestAsync(cancellationToken);
            return _appDataSanitizer.Sanitize(latestDocument, calendar, _clock.UtcNow);
        }
        catch
        {
            return _appDataSanitizer.CreateDefaultAppData(calendar, _clock.UtcNow);
        }
    }
}
