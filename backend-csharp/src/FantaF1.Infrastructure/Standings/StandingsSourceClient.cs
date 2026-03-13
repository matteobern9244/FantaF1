using FantaF1.Application.Abstractions.Services;
using FantaF1.Application.Abstractions.System;

namespace FantaF1.Infrastructure.Standings;

public sealed class StandingsSourceClient : IStandingsSourceClient
{
    private readonly HttpClient _httpClient;
    private readonly IClock _clock;

    public StandingsSourceClient(HttpClient httpClient, IClock clock)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public Task<string> FetchDriverStandingsHtmlAsync(CancellationToken cancellationToken)
    {
        return FetchHtmlAsync(BuildDriversUrl(), cancellationToken);
    }

    public Task<string> FetchConstructorStandingsHtmlAsync(CancellationToken cancellationToken)
    {
        return FetchHtmlAsync(BuildConstructorsUrl(), cancellationToken);
    }

    private string BuildDriversUrl()
    {
        return $"{OfficialStandingsReferenceData.BaseUrl}/{OfficialStandingsReferenceData.DriversPathTemplate.Replace("{year}", _clock.UtcNow.Year.ToString(), StringComparison.Ordinal)}";
    }

    private string BuildConstructorsUrl()
    {
        return $"{OfficialStandingsReferenceData.BaseUrl}/{OfficialStandingsReferenceData.ConstructorsPathTemplate.Replace("{year}", _clock.UtcNow.Year.ToString(), StringComparison.Ordinal)}";
    }

    private async Task<string> FetchHtmlAsync(string url, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("user-agent", OfficialStandingsReferenceData.BrowserUserAgent);
        request.Headers.TryAddWithoutValidation("accept-language", OfficialStandingsReferenceData.BrowserAcceptLanguage);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(((int)response.StatusCode).ToString());
        }

        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
}
