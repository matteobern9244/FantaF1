namespace FantaF1.Application.Abstractions.Services;

public interface IAdminSessionService
{
    Task<AdminSessionResponse> GetSessionAsync(string? cookieHeader, CancellationToken cancellationToken);

    Task<AdminSessionLoginResult> LoginAsync(string? password, CancellationToken cancellationToken);

    AdminSessionCommandResult Logout();
}

public sealed record AdminSessionResponse(
    bool IsAdmin,
    string DefaultViewMode);

public sealed record AdminSessionLoginResult(
    bool IsAuthenticated,
    AdminSessionResponse Response,
    string? SetCookieHeaderValue);

public sealed record AdminSessionCommandResult(
    AdminSessionResponse Response,
    string SetCookieHeaderValue);
