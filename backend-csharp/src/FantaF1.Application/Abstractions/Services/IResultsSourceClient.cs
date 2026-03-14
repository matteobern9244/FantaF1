namespace FantaF1.Application.Abstractions.Services;

public interface IResultsSourceClient
{
    Task<string> FetchHtmlAsync(string url, CancellationToken cancellationToken);
}
