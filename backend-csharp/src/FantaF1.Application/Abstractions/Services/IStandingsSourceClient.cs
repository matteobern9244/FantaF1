namespace FantaF1.Application.Abstractions.Services;

public interface IStandingsSourceClient
{
    Task<string> FetchDriverStandingsHtmlAsync(CancellationToken cancellationToken);

    Task<string> FetchConstructorStandingsHtmlAsync(CancellationToken cancellationToken);
}
