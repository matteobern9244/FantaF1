namespace FantaF1.Application.Abstractions.Services;

public static class SaveRouteContract
{
    public const int ParticipantSlots = 3;
    public const int BadRequestStatusCode = 400;
    public const int UnauthorizedStatusCode = 401;
    public const int ForbiddenStatusCode = 403;
    public const int InternalServerErrorStatusCode = 500;

    public const string AdminAuthRequiredCode = "admin_auth_required";
    public const string ParticipantsInvalidCode = "participants_invalid";
    public const string PredictionsMissingCode = "predictions_missing";
    public const string RaceLockedCode = "race_locked";
    public const string DatabaseTargetMismatchCode = "database_target_mismatch";
    public const string StorageWriteFailedCode = "storage_write_failed";
    public const string SaveUnexpectedErrorCode = "save_unexpected_error";

    public const string AdminAuthRequiredError = "Admin authentication required";
    public const string MissingPredictionsError = "Il salvataggio richiede l'inserimento di almeno un pronostico.";
    public const string RaceLockedError = "I pronostici sono bloccati.";
    public const string SaveFailedError = "Impossibile salvare i dati.";
    public const string SaveSuccessMessage = "Dati salvati correttamente.";

    public const string ParticipantsInvalidTemplate = "Invalid participants list. Expected {participantSlots} participants.";
    public const string ParticipantsInvalidDetailsTemplate = "Expected {participantSlots} participants, received {received}.";
    public const string PredictionsMissingDetails = "At least one prediction is required for manual predictions save.";
    public const string RaceLockedDetailsTemplate = "Race {meetingKey} started at {startTime} and current predictions differ from stored data.";

    public static IReadOnlyList<string> PredictionFieldOrder { get; } = ["first", "second", "third", "pole"];

    public static SaveSuccessOutcome CreateSuccess()
    {
        return new SaveSuccessOutcome(new SaveSuccessPayload(SaveSuccessMessage));
    }

    public static SaveErrorOutcome CreateAdminRequiredError()
    {
        return new SaveErrorOutcome(
            UnauthorizedStatusCode,
            new SaveErrorPayload(
                AdminAuthRequiredError,
                AdminAuthRequiredCode,
                null,
                null));
    }

    public static SaveErrorOutcome CreateValidationError(
        string environment,
        string requestId,
        string code,
        string error,
        string? details)
    {
        return new SaveErrorOutcome(
            ResolveStatusCode(code),
            BuildSaveErrorPayload(environment, requestId, code, error, details));
    }

    public static SaveErrorOutcome CreateGenericError(
        string environment,
        string requestId,
        Exception exception)
    {
        var code = ClassifySaveError(exception);

        return new SaveErrorOutcome(
            ResolveStatusCode(code),
            BuildSaveErrorPayload(
                environment,
                requestId,
                code,
                SaveFailedError,
                ExtractErrorDetails(exception)));
    }

    public static SaveErrorPayload BuildSaveErrorPayload(
        string environment,
        string? requestId,
        string code,
        string error,
        string? details)
    {
        return new SaveErrorPayload(
            error,
            code,
            requestId,
            string.Equals(environment, AdminSessionContract.ProductionEnvironment, StringComparison.Ordinal)
                ? null
                : details);
    }

    public static string ExtractErrorDetails(Exception exception)
    {
        ArgumentNullException.ThrowIfNull(exception);

        return string.IsNullOrWhiteSpace(exception.StackTrace)
            ? exception.Message
            : exception.ToString();
    }

    public static string ClassifySaveError(Exception exception)
    {
        var normalizedDetails = ExtractErrorDetails(exception).ToLowerInvariant();

        if (normalizedDetails.Contains("invalid participants list", StringComparison.Ordinal))
        {
            return ParticipantsInvalidCode;
        }

        if (normalizedDetails.Contains("almeno un pronostico", StringComparison.Ordinal)
            || normalizedDetails.Contains("at least one prediction", StringComparison.Ordinal))
        {
            return PredictionsMissingCode;
        }

        if (normalizedDetails.Contains("pronostici sono bloccati", StringComparison.Ordinal))
        {
            return RaceLockedCode;
        }

        if (normalizedDetails.Contains("mongodb_uri targets", StringComparison.Ordinal)
            || normalizedDetails.Contains("connected to unexpected mongodb database", StringComparison.Ordinal))
        {
            return DatabaseTargetMismatchCode;
        }

        if (normalizedDetails.Contains("mongo", StringComparison.Ordinal)
            || normalizedDetails.Contains("ecast", StringComparison.Ordinal)
            || normalizedDetails.Contains("validationerror", StringComparison.Ordinal)
            || normalizedDetails.Contains("storage error", StringComparison.Ordinal))
        {
            return StorageWriteFailedCode;
        }

        return SaveUnexpectedErrorCode;
    }

    public static int ResolveStatusCode(string code)
    {
        return code switch
        {
            AdminAuthRequiredCode => UnauthorizedStatusCode,
            ParticipantsInvalidCode => BadRequestStatusCode,
            PredictionsMissingCode => BadRequestStatusCode,
            RaceLockedCode => ForbiddenStatusCode,
            _ => InternalServerErrorStatusCode,
        };
    }

    public static string FormatTemplate(string template, params (string Key, object? Value)[] replacements)
    {
        return replacements.Aggregate(
            template,
            static (currentValue, replacement) => currentValue.Replace(
                $"{{{replacement.Key}}}",
                Convert.ToString(replacement.Value, global::System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
                StringComparison.Ordinal));
    }
}

public enum SaveRouteKind
{
    Data,
    Predictions,
}
