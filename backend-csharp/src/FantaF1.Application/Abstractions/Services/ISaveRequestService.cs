using FantaF1.Domain.ReadModels;

namespace FantaF1.Application.Abstractions.Services;

public interface ISaveRequestService
{
    Task<SaveRequestOutcome> SaveDataAsync(AppDataDocument? requestBody, string? cookieHeader, CancellationToken cancellationToken);

    Task<SaveRequestOutcome> SavePredictionsAsync(AppDataDocument? requestBody, string? cookieHeader, CancellationToken cancellationToken);
}

public abstract record SaveRequestOutcome;

public sealed record SaveSuccessOutcome(
    SaveSuccessPayload Payload) : SaveRequestOutcome;

public sealed record SaveErrorOutcome(
    int StatusCode,
    SaveErrorPayload Payload) : SaveRequestOutcome;

public sealed record SaveSuccessPayload(
    string Message);

public sealed record SaveErrorPayload(
    string Error,
    string Code,
    string? RequestId,
    string? Details);
