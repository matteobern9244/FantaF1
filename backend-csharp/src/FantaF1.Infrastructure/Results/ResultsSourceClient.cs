using FantaF1.Application.Abstractions.Services;

namespace FantaF1.Infrastructure.Results;

public sealed class ResultsSourceClient : IResultsSourceClient
{
    private readonly HttpClient _httpClient;

    public ResultsSourceClient(HttpClient httpClient)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    }

    public async Task<string> FetchHtmlAsync(string url, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("user-agent", OfficialResultsReferenceData.BrowserUserAgent);
        request.Headers.TryAddWithoutValidation("accept-language", OfficialResultsReferenceData.BrowserAcceptLanguage);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(((int)response.StatusCode).ToString());
        }

        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
}
