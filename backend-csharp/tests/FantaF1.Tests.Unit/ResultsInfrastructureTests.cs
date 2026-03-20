using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using FantaF1.Application.Abstractions.System;
using FantaF1.Domain.ReadModels;
using FantaF1.Domain.Results;
using FantaF1.Infrastructure.Results;

namespace FantaF1.Tests.Unit;

public sealed class ResultsInfrastructureTests
{
    [Fact]
    public void Results_source_client_rejects_null_dependencies()
    {
        using var httpClient = new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)));
        var clock = new StubClock(new DateTimeOffset(2026, 03, 13, 09, 00, 00, TimeSpan.Zero));

        Assert.Throws<ArgumentNullException>(() => new ResultsSourceClient(null!));
        Assert.Throws<ArgumentNullException>(() => new RaceHighlightsLookupService(null!, clock, new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1))));
        Assert.Throws<ArgumentNullException>(() => new RaceHighlightsLookupService(httpClient, null!, new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1))));
        Assert.Throws<ArgumentNullException>(() => new RaceHighlightsLookupService(httpClient, clock, null!));
    }

    [Fact]
    public void Highlights_lookup_service_should_lookup_matches_the_node_policy()
    {
        using var httpClient = new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)));
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        Assert.False(service.ShouldLookup(CreateWeekend() with { HighlightsVideoUrl = "https://www.youtube.com/watch?v=done" }, new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)));
        Assert.False(service.ShouldLookup(CreateWeekend() with { EndDate = "2026-03-02" }, new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)));
        Assert.True(service.ShouldLookup(CreateWeekend(), new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)));
    }

    [Fact]
    public async Task Results_source_client_sends_node_compatible_browser_headers()
    {
        var handler = new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("<table></table>"),
        });
        using var httpClient = new HttpClient(handler);
        var client = new ResultsSourceClient(httpClient);

        var result = await client.FetchHtmlAsync("https://www.formula1.com/en/results/2026/races/1280/china/race-result", CancellationToken.None);

        Assert.Equal("<table></table>", result);
        Assert.NotNull(handler.LastRequest);
        Assert.Equal("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36", handler.LastRequest!.Headers.UserAgent.ToString());
        Assert.Equal(
            "it-IT,it;q=0.9,en;q=0.8",
            string.Join(",", handler.LastRequest.Headers.GetValues("accept-language")).Replace(" ", string.Empty, StringComparison.Ordinal));
    }

    [Fact]
    public async Task Results_source_client_throws_the_status_code_when_the_response_is_not_successful()
    {
        using var httpClient = new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.BadGateway)));
        var client = new ResultsSourceClient(httpClient);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => client.FetchHtmlAsync("https://www.formula1.com/en/results/2026/races/1280/china/race-result", CancellationToken.None));

        Assert.Equal("502", exception.Message);
    }

    [Fact]
    public async Task Highlights_lookup_service_returns_the_feed_candidate_when_it_matches_the_race_and_publisher()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
                          <entry>
                            <yt:videoId>skyf1-finished</yt:videoId>
                            <title>F1, GP d'Australia, gli highlights della gara 2026</title>
                            <link rel="alternate" href="https://www.youtube.com/watch?v=skyf1-finished" />
                            <author>
                              <name>Sky Sport F1</name>
                              <uri>https://www.youtube.com/@skysportf1</uri>
                            </author>
                            <published>2026-03-01T16:00:00+00:00</published>
                          </entry>
                        </feed>
                        """),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        {
                          "title": "F1, GP d'Australia, gli highlights della gara 2026",
                          "author_name": "Sky Sport F1",
                          "author_url": "https://www.youtube.com/@skysportf1"
                        }
                        """),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal(
            new HighlightsLookupDocument(
                "https://www.youtube.com/watch?v=skyf1-finished",
                "2026-03-01T18:00:00.0000000+00:00",
                "found",
                "feed"),
            result);
    }

    [Fact]
    public async Task Highlights_lookup_service_falls_back_to_channel_search_when_the_feed_is_empty()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"channel-search-video","title":{"simpleText":"F1, GP d'Australia, highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"channel-search-video"}}}}]}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        {
                          "title": "F1, GP d'Australia, highlights 2026",
                          "author_name": "Sky Sport F1",
                          "author_url": "https://www.youtube.com/@skysportf1"
                        }
                        """),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=channel-search-video", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    [Fact]
    public async Task Highlights_lookup_service_uses_the_skysportf1_playlists_page_before_channel_search_when_it_contains_a_matching_video()
    {
        var requestedUris = new List<string>();
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            requestedUris.Add(uri);

            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri == "https://www.youtube.com/@skysportf1/playlists")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"playlistRenderer":{"playlistId":"playlist-1","title":{"simpleText":"Highlights 2026"},"navigationEndpoint":{"watchEndpoint":{"videoId":"playlist-video"}}}}]}"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        {
                          "title": "F1, GP d'Australia, gli highlights della gara 2026",
                          "author_name": "Sky Sport F1",
                          "author_url": "https://www.youtube.com/@skysportf1"
                        }
                        """),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"channel-search-video","title":{"simpleText":"F1, GP d'Australia, highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"channel-search-video"}}}}]}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=playlist-video", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("playlists", result.HighlightsLookupSource);
        Assert.Contains("https://www.youtube.com/@skysportf1/playlists", requestedUris);
        Assert.DoesNotContain(requestedUris, uri => uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Highlights_lookup_service_uses_localized_alias_queries_for_later_finished_races()
    {
        var requestedUris = new List<string>();
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var requestUri = request.RequestUri!.AbsoluteUri;
            requestedUris.Add(requestUri);

            if (requestUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (requestUri.Contains("/@skysportf1/search?query=China%202026%20highlights%20Sky%20Sport%20F1", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"contents":[]}"""),
                };
            }

            if (requestUri.Contains("/@skysportf1/search?query=Cina%202026%20highlights%20Sky%20Sport%20F1", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"china-search-video","title":{"simpleText":"F1, GP della Cina, gli highlights della gara 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"china-search-video"}}}}]}"""),
                };
            }

            if (requestUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        {
                          "title": "F1, GP della Cina, gli highlights della gara 2026",
                          "author_name": "Sky Sport F1",
                          "author_url": "https://www.youtube.com/@skysportf1"
                        }
                        """),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 22, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(
            CreateWeekend() with
            {
                MeetingName = "China",
                GrandPrixTitle = "FORMULA 1 CHINESE GRAND PRIX 2026",
                RoundNumber = 2,
                DateRangeLabel = "20 - 22 MAR",
                DetailUrl = "https://www.formula1.com/en/racing/2026/china",
                StartDate = "2026-03-20",
                EndDate = "2026-03-22",
                RaceStartTime = "2026-03-22T07:00:00Z",
            },
            CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=china-search-video", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
        Assert.Contains(
            "https://www.youtube.com/@skysportf1/search?query=China%202026%20highlights%20Sky%20Sport%20F1",
            requestedUris);
        Assert.Contains(
            "https://www.youtube.com/@skysportf1/search?query=Cina%202026%20highlights%20Sky%20Sport%20F1",
            requestedUris);
    }

    [Fact]
    public async Task Highlights_lookup_service_falls_back_to_the_sky_sport_highlights_page_when_youtube_sources_do_not_match()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;

            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri == "https://www.youtube.com/@skysportf1/playlists")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"contents":[]}"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal)
                || uri.Contains("/results?search_query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"contents":[]}"""),
                };
            }

            if (uri == "https://sport.sky.it/formula-1/video/highlights")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <a href="/formula-1/video/2026/03/08/f1-gp-australia-highlights-gara">
                          <span>F1, GP d'Australia, gli highlights della gara 2026</span>
                        </a>
                        """),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://sport.sky.it/formula-1/video/2026/03/08/f1-gp-australia-highlights-gara", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("sky-page", result.HighlightsLookupSource);
    }

    [Fact]
    public async Task Highlights_lookup_service_returns_missing_when_the_sky_sport_page_contains_only_non_highlights_content()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;

            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri == "https://www.youtube.com/@skysportf1/playlists")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"contents":[]}"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal)
                || uri.Contains("/results?search_query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"contents":[]}"""),
                };
            }

            if (uri == "https://sport.sky.it/formula-1/video/highlights")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <a href="https://sport.sky.it/formula-1/video/2026/03/08/intervista-verstappen">
                          <span>F1, GP d'Australia, intervista a Verstappen 2026</span>
                        </a>
                        """),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal(string.Empty, result.HighlightsVideoUrl);
        Assert.Equal("missing", result.HighlightsLookupStatus);
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("https://sport.sky.it/formula-1/video/highlights/gp-australia", "https://sport.sky.it/formula-1/video/highlights/gp-australia")]
    [InlineData("/formula-1/video/highlights/gp-australia", "https://sport.sky.it/formula-1/video/highlights/gp-australia")]
    [InlineData("formula-1/video/highlights/gp-australia", "")]
    public void Highlights_lookup_service_private_normalize_sky_highlights_url_handles_empty_absolute_relative_and_invalid_values(
        string? input,
        string expected)
    {
        var normalized = InvokePrivateStaticMethod<string>(
            typeof(RaceHighlightsLookupService),
            "NormalizeSkyHighlightsUrl",
            input);

        Assert.Equal(expected, normalized);
    }

    [Fact]
    public async Task Highlights_lookup_service_private_validate_candidate_async_rejects_non_matching_sky_page_candidates()
    {
        using var httpClient = new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound)));
        var service = new RaceHighlightsLookupService(
            httpClient,
            new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)),
            new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));
        var candidateType = typeof(RaceHighlightsLookupService).GetNestedType("HighlightsCandidate", BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("HighlightsCandidate nested type not found.");
        var candidate = Activator.CreateInstance(
            candidateType,
            "",
            "https://sport.sky.it/formula-1/video/2026/03/08/intervista-verstappen",
            "Intervista esclusiva 2026",
            "Sky Sport F1",
            "https://sport.sky.it/formula-1/video/highlights",
            "",
            "sky-page")!;
        var method = typeof(RaceHighlightsLookupService).GetMethod("ValidateCandidateAsync", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("ValidateCandidateAsync not found.");

        var task = (Task)method.Invoke(service, [candidate, CreateWeekend(), "2026", CancellationToken.None])!;
        await task;
        var result = task.GetType().GetProperty("Result")!.GetValue(task);

        Assert.Null(result);
    }

    [Fact]
    public async Task Highlights_lookup_service_returns_missing_when_no_valid_candidate_is_found()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"wrong-channel","title":{"simpleText":"F1, GP d'Australia, gli highlights della gara 2026"},"ownerText":{"simpleText":"Altro canale"},"navigationEndpoint":{"watchEndpoint":{"videoId":"wrong-channel"}}}}]}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/results?search_query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"global-search-video","title":{"simpleText":"F1, GP d'Australia, gli highlights della gara 2026"},"ownerText":{"simpleText":"Altro canale"},"navigationEndpoint":{"watchEndpoint":{"videoId":"global-search-video"}}}}]}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        {
                          "title": "F1, GP d'Australia, gli highlights della gara 2026",
                          "author_name": "Altro canale",
                          "author_url": "https://www.youtube.com/@altrocanale"
                        }
                        """),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal(
            new HighlightsLookupDocument(
                "",
                "2026-03-01T18:00:00.0000000+00:00",
                "missing",
                ""),
            result);
    }

    [Fact]
    public async Task Highlights_lookup_service_uses_anchor_fallback_when_json_blocks_are_unusable()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<a href="/watch?v=channel-search-anchor"><span>F1, GP d'Australia, gli highlights della gara 2026</span></a>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        {
                          "title": "F1, GP d'Australia, gli highlights della gara 2026",
                          "author_name": "Sky Sport F1",
                          "author_url": "https://www.youtube.com/@skysportf1"
                        }
                        """),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=channel-search-anchor", result.HighlightsVideoUrl);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    [Fact]
    public async Task Highlights_lookup_service_returns_missing_when_oembed_validation_fails_and_rejects_null_races()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
                          <entry>
                            <yt:videoId>feed-video</yt:videoId>
                            <title>F1, GP d'Australia, gli highlights della gara 2026</title>
                            <link rel="alternate" href="https://www.youtube.com/watch?v=feed-video" />
                            <author>
                              <name>Sky Sport F1</name>
                              <uri>https://www.youtube.com/@skysportf1</uri>
                            </author>
                            <published>2026-03-01T16:00:00+00:00</published>
                          </entry>
                        </feed>
                        """),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.BadGateway);
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        await Assert.ThrowsAsync<ArgumentNullException>(() => service.ResolveAsync(null!, CancellationToken.None));
        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("", result.HighlightsVideoUrl);
        Assert.Equal("missing", result.HighlightsLookupStatus);
    }

    [Fact]
    public async Task Highlights_lookup_service_resolves_from_global_search_with_sky_channel_id_publisher_match()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("no json renderers here"),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/results?search_query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"global-sky-video","title":{"simpleText":"F1, GP d'Australia, gli highlights della gara 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"global-sky-video"}}}}]}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1, GP d'Australia, gli highlights della gara 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/channel/UCMQ7Gx6v-pQy_gsRoMJYzOA"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=global-sky-video", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("global-search", result.HighlightsLookupSource);
    }

    [Fact]
    public async Task Highlights_lookup_service_handles_shorts_url_commandmetadata_and_derive_season_year_from_title()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"shorts123456","title":{"simpleText":"F1, GP Australia, gli highlights gara 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"commandMetadata":{"webCommandMetadata":{"url":"/shorts/shorts123456"}}}}}]}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1, GP Australia, gli highlights gara 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        // Race with no year in detailUrl; DeriveSeasonYear falls back to GrandPrixTitle
        var race = new WeekendDocument(
            "finished-race",
            "Australia",
            "FORMULA 1 AUSTRALIAN GRAND PRIX 2026",
            1,
            "01 - 03 MAR",
            "https://www.formula1.com/en/racing/australia",
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "",
            "",
            "",
            "");

        var result = await service.ResolveAsync(race, CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=shorts123456", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    [Fact]
    public async Task Highlights_lookup_service_handles_runs_text_format_and_secondary_keywords()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                // Renderer using "runs" array format for title
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"runs-format-vid","title":{"runs":[{"text":"F1, GP d'Australia"},{"text":", sintesi gara 2026"}]},"longBylineText":{"runs":[{"text":"Sky Sport F1"}]},"navigationEndpoint":{"watchEndpoint":{"videoId":"runs-format-vid"}}}}]}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1, GP d'Australia, sintesi gara 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=runs-format-vid", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
    }

    [Fact]
    public async Task Highlights_lookup_service_filters_candidates_with_negative_keywords_and_year_mismatch()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                // Feed with: 1) entry with negative keyword, 2) entry with wrong year, 3) valid entry
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
                          <entry>
                            <yt:videoId>negative-video</yt:videoId>
                            <title>F1, GP d'Australia, intervista 2026</title>
                            <author><name>Sky Sport F1</name><uri>https://www.youtube.com/@skysportf1</uri></author>
                            <published>2026-03-01T16:00:00+00:00</published>
                          </entry>
                          <entry>
                            <yt:videoId>wrong-year-vid</yt:videoId>
                            <title>F1, GP d'Australia, highlights 2025</title>
                            <author><name>Sky Sport F1</name><uri>https://www.youtube.com/@skysportf1</uri></author>
                            <published>2026-03-01T16:00:00+00:00</published>
                          </entry>
                          <entry>
                            <yt:videoId>valid-feed-vid</yt:videoId>
                            <title>F1, GP d'Australia, gli highlights della gara 2026</title>
                            <author><name>Sky Sport F1</name><uri>https://www.youtube.com/@skysportf1</uri></author>
                            <published>2026-03-01T16:00:00+00:00</published>
                          </entry>
                        </feed>
                        """),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                var url = request.RequestUri.AbsoluteUri;
                if (url.Contains("valid-feed-vid", StringComparison.Ordinal))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(
                            """{"title":"F1, GP d'Australia, gli highlights della gara 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                    };
                }

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"title":"other","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=valid-feed-vid", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
    }

    [Fact]
    public async Task Highlights_lookup_service_handles_extract_between_missing_tag_and_escaped_quotes_in_json()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                // Entry missing <yt:videoId> tag so ExtractBetween returns empty → candidate filtered out
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
                          <entry>
                            <title>F1, GP d'Australia, no video id entry</title>
                            <author><name>Sky Sport F1</name></author>
                          </entry>
                        </feed>
                        """),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                // JSON with escaped quote inside string (covers FindMatchingBraceIndex escape handling)
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"videoRenderer":{"videoId":"escaped-vid","title":{"simpleText":"F1 \"highlights\" d'Australia 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"escaped-vid"}}}}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1 highlights d'Australia 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=escaped-vid", result.HighlightsVideoUrl);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    [Fact]
    public async Task Highlights_lookup_service_handles_derive_season_year_fallback_to_meeting_name_and_current_year()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"no-year-vid","title":{"simpleText":"F1, GP Australia, highlights gara"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"no-year-vid"}}}}]}"""),
                };
            }

            if (request.RequestUri!.AbsoluteUri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1, GP Australia, highlights gara","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        // Race with no year in detailUrl, GrandPrixTitle, or MeetingName → DeriveSeasonYear uses DateTime.UtcNow
        var raceNoYear = new WeekendDocument(
            "finished-race",
            "Australia",
            "FORMULA 1 AUSTRALIAN GRAND PRIX",
            1,
            "01 - 03 MAR",
            "https://www.formula1.com/en/racing/australia",
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "",
            "",
            "",
            "");

        var result = await service.ResolveAsync(raceNoYear, CancellationToken.None);
        Assert.NotNull(result.HighlightsLookupStatus);

        // Race with no year in detailUrl/GrandPrixTitle but year in MeetingName → ExtractSeasonYear(MeetingName) path
        var raceMeetingNameYear = new WeekendDocument(
            "finished-race",
            "Australia 2026",
            "FORMULA 1 AUSTRALIAN GRAND PRIX",
            1,
            "01 - 03 MAR",
            "https://www.formula1.com/en/racing/australia",
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "",
            "",
            "",
            "");

        var result2 = await service.ResolveAsync(raceMeetingNameYear, CancellationToken.None);
        Assert.NotNull(result2.HighlightsLookupStatus);
    }

    // ── Test A ────────────────────────────────────────────────────────────────
    // Exercises ReadNestedWatchEndpointVideoId paths (line 517) and the ternary
    // at line 190 (rawVideoUrl null/empty + videoId present/absent combinations).
    [Fact]
    public async Task Highlights_lookup_service_covers_extract_candidates_json_paths_and_read_nested_endpoint()
    {
        // Renderer 1: no direct videoId, has navigationEndpoint.watchEndpoint.videoId
        //   → ReadJsonString("videoId") = null  →  ReadNestedWatchEndpointVideoId returns "nodirectvid1"
        //   → rawVideoUrl = null (no commandMetadata)
        //   → ternary: rawVideoUrl is empty AND videoId is NOT empty → uses /watch?v=nodirectvid1
        // Renderer 2: no direct videoId, no navigationEndpoint at all
        //   → ReadNestedWatchEndpointVideoId returns null  →  videoId = ""
        //   → ternary: rawVideoUrl is empty AND videoId is empty → rawVideoUrl (empty) → VideoUrl = ""  → filtered out
        // Renderer 3: no direct videoId, has navigationEndpoint but no watchEndpoint
        //   → ReadNestedWatchEndpointVideoId returns null → filtered out
        // Renderer 4: no direct videoId, has navigationEndpoint.watchEndpoint but no videoId inside
        //   → ReadNestedWatchEndpointVideoId returns null → filtered out
        var channelSearchJson =
            """
            {"videoRenderer":{"title":{"simpleText":"F1 GP Australia highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"nodirectvid1"}}}}
            {"videoRenderer":{"title":{"simpleText":"F1 GP Australia 2026 no nav"},"ownerText":{"simpleText":"Sky Sport F1"}}}
            {"videoRenderer":{"title":{"simpleText":"F1 GP Australia 2026 nav no watch"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{}}}
            {"videoRenderer":{"title":{"simpleText":"F1 GP Australia 2026 watch no vid"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{}}}}
            """;

        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(channelSearchJson),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1 GP Australia highlights 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=nodirectvid1", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    // ── Test B ────────────────────────────────────────────────────────────────
    // Exercises BuildSearchQuery / DeriveSeasonYear with null fields:
    //  - GrandPrixTitle=null, MeetingName=null, MeetingKey="some-key", DetailUrl=null
    //    → BuildSearchQuery falls back to MeetingKey; DeriveSeasonYear: DetailUrl null → regex on ""
    //      → no match → ExtractSeasonYear(null ?? null) → null → DateTime.UtcNow year
    //  - GrandPrixTitle=null, MeetingName=null, MeetingKey=null
    //    → titleSeed = "" → string.IsNullOrWhiteSpace = true → seasonYear = ""
    [Fact]
    public async Task Highlights_lookup_service_covers_build_search_query_and_derive_season_year_with_null_fields()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            // Return empty for all search URLs so both races fall through to "missing"
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("no renderers"),
            };
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        // Race with MeetingKey non-null, DetailUrl=null → triggers both DeriveSeasonYear null-DetailUrl
        // path and ExtractSeasonYear(null) path, then falls back to DateTime.UtcNow.Year
        var raceWithKey = new WeekendDocument(
            "finished-race",
            null!,
            null!,
            1,
            "01 - 03 MAR",
            null!,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "some-key",
            "",
            "",
            "");

        var result1 = await service.ResolveAsync(raceWithKey, CancellationToken.None);
        Assert.Equal("missing", result1.HighlightsLookupStatus);

        // Race with ALL null text fields → titleSeed = "" → IsNullOrWhiteSpace = true → seasonYear = ""
        var raceAllNull = new WeekendDocument(
            "finished-race",
            null!,
            null!,
            1,
            "01 - 03 MAR",
            null!,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            null!,
            "",
            "",
            "");

        var result2 = await service.ResolveAsync(raceAllNull, CancellationToken.None);
        Assert.Equal("missing", result2.HighlightsLookupStatus);
    }

    // ── Test C ────────────────────────────────────────────────────────────────
    // Exercises BuildRaceMatchTerms alias expansion paths (lines 334-347):
    // A race whose fields contain an alias key (e.g. "great britain" / "emilia romagna")
    // triggers the inner foreach loops that add alias tokens to the terms set.
    [Fact]
    public async Task Highlights_lookup_service_covers_build_race_match_terms_alias_expansion()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                // Return a renderer whose title contains both "great britain" and "silverstone" alias
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"videoRenderer":{"videoId":"silverstone-vid","title":{"simpleText":"F1 GP Great Britain Silverstone highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"silverstone-vid"}}}}"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1 GP Great Britain Silverstone highlights 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 06, 29, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        // Race for Great Britain: the "great britain" alias key maps to ["silverstone"]
        var race = new WeekendDocument(
            "finished-race",
            "Great Britain",
            "FORMULA 1 GREAT BRITAIN GRAND PRIX 2026",
            10,
            "27 - 29 JUN",
            "https://www.formula1.com/en/racing/2026/great-britain",
            null,
            null,
            false,
            "2026-06-27",
            "2026-06-29",
            "2026-06-29T14:00:00Z",
            [],
            "",
            "",
            "",
            "");

        var result = await service.ResolveAsync(race, CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=silverstone-vid", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    // ── Test D ────────────────────────────────────────────────────────────────
    // Exercises ExtractJsonVideoRenderers malformed JSON (catch block at line 433)
    // and FindMatchingBraceIndex with deeper brace nesting.
    [Fact]
    public async Task Highlights_lookup_service_covers_extractjsonvideo_malformed_and_findbrace_depth()
    {
        // First JSON block has balanced braces so FindMatchingBraceIndex succeeds, but
        // it contains a trailing comma making it invalid JSON → JsonDocument.Parse throws →
        // caught by the catch block at line 433 → scanning continues.
        // Second block is valid and should be used as the candidate.
        var malformedThenValid =
            """{"videoRenderer":{"videoId":"bad",}}{"videoRenderer":{"videoId":"good-vid-abc","title":{"simpleText":"F1 GP Australia highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"good-vid-abc"}}}}""";

        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(malformedThenValid),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1 GP Australia highlights 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=good-vid-abc", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
    }

    // ── Test E ────────────────────────────────────────────────────────────────
    // Exercises ReadRendererText "runs" items that lack the "text" property (lines 546).
    // Also exercises oEmbed response missing "title" field so ReadJsonString returns null
    // and candidate keeps its original Title (lines 161-165 null paths).
    [Fact]
    public async Task Highlights_lookup_service_covers_read_renderer_text_missing_text_and_readjsonstring_missing()
    {
        // The "runs" array for "title" has one item without "text" and one with "text".
        // The title built from this becomes "F1 GP Australia highlights 2026".
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"videoRenderer":{"videoId":"runs-partial-vid","title":{"runs":[{"notext":"ignored"},{"text":"F1 GP Australia highlights 2026"}]},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"runs-partial-vid"}}}}"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                // Missing "title" and "author_url" → ReadJsonString returns null for those →
                // candidate keeps original Title and AuthorUrl but gets AuthorName from oEmbed.
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"author_name":"Sky Sport F1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        // The candidate keeps its original AuthorUrl (defaultAuthorUrl from channel-search = channel URL).
        // IsPublisherMatch checks for "@skysportf1" in AuthorUrl → match → validatedCandidate returned.
        Assert.Equal("https://www.youtube.com/watch?v=runs-partial-vid", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    // ── Test F ────────────────────────────────────────────────────────────────
    // Exercises LoadFeedCandidatesAsync with whitespace-only feed response (line 86 path 0)
    // and ExtractBetween when end tag is missing (line 581 path 1).
    [Fact]
    public async Task Highlights_lookup_service_covers_extract_between_end_missing_and_load_feed_empty()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                // Whitespace-only → IsNullOrWhiteSpace = true → returns []
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("   "),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                // A feed-style entry that has <yt:videoId> but <title> without closing </title>
                // → ExtractBetween("<title>", "</title>") returns "" (end tag missing).
                // But also include a valid anchor so we get a candidate through the anchor path.
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<a href="/watch?v=anchor-end-miss"><span>F1 GP Australia highlights 2026</span></a>"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1 GP Australia highlights 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=anchor-end-miss", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    // ── Test G ────────────────────────────────────────────────────────────────
    // Exercises oEmbed returning an empty JSON object → ReadJsonString returns null
    // for all three fields (title, author_name, author_url) → candidate keeps originals.
    // The original candidate from channel-search has AuthorUrl = channel URL containing
    // "@skysportf1" → IsPublisherMatch returns true → candidate returned.
    [Fact]
    public async Task Highlights_lookup_service_covers_validate_candidate_oembed_all_fields_null()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"videoRenderer":{"videoId":"empty-oembed-vid","title":{"simpleText":"F1 GP Australia highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"empty-oembed-vid"}}}}"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                // Empty JSON object → all ReadJsonString calls return null
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{}"),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        // defaultAuthorUrl for channel-search = "https://www.youtube.com/@skysportf1"
        // → IsPublisherMatch will match "@skysportf1" → candidate returned.
        Assert.Equal("https://www.youtube.com/watch?v=empty-oembed-vid", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("channel-search", result.HighlightsLookupSource);
    }

    // ── Test H ────────────────────────────────────────────────────────────────
    // Exercises BuildCandidateScore: publishedAt null path (line 304 path 0).
    // Feed entry has no <published> tag → ParsePublishedAt returns null → score +1 NOT added.
    [Fact]
    public async Task Highlights_lookup_service_build_candidate_score_published_at_null_branch()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
                          <entry>
                            <yt:videoId>no-published-vid</yt:videoId>
                            <title>F1, GP d'Australia, gli highlights della gara 2026</title>
                            <author><name>Sky Sport F1</name><uri>https://www.youtube.com/@skysportf1</uri></author>
                          </entry>
                        </feed>
                        """),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1, GP d'Australia, gli highlights della gara 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=no-published-vid", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("feed", result.HighlightsLookupSource);
    }

    // ── Test I ────────────────────────────────────────────────────────────────
    // Exercises BuildCandidateScore global-search source where publisher DOES match
    // (line 253 off 202 path 0: condition is false → does NOT return NegativeInfinity).
    // Channel-search returns no valid candidates (all filtered out). Global-search
    // returns a renderer whose oEmbed confirms Sky Sport publisher → score is finite.
    [Fact]
    public async Task Highlights_lookup_service_global_search_publisher_match_does_not_return_negative_infinity()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                // No usable renderers and no valid anchors
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("no renderers here"),
                };
            }

            if (uri.Contains("/results?search_query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"videoRenderer":{"videoId":"global-sky-match","title":{"simpleText":"F1 GP Australia highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"global-sky-match"}}}}"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1 GP Australia highlights 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=global-sky-match", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
        Assert.Equal("global-search", result.HighlightsLookupSource);
    }

    // ── Test J ────────────────────────────────────────────────────────────────
    // Exercises the ExtractBetween "end tag missing" path in feed processing (line 581 path 1):
    // A feed entry has <title> without </title> → ExtractBetween returns "" for title.
    // The entry still has a valid videoId so the candidate is created with empty title.
    // Also exercises BuildRaceMatchTerms line 316 path 0 where the DetailUrl-derived
    // value is null (DetailUrl = null → Split('/').LastOrDefault() = null → normalizedValue = "").
    [Fact]
    public async Task Highlights_lookup_service_covers_extract_between_missing_end_tag_in_feed_entry()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                // Entry has <title> without </title> — ExtractBetween returns "" for title.
                // But videoId is present, so candidate VideoUrl is non-empty → passes filter.
                // However, BuildCandidateScore will return NegativeInfinity because title="" has
                // no raceMatchTerm → candidate filtered in SortCandidates → not returned.
                // So feed returns no usable candidate.
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
                          <entry>
                            <yt:videoId>notitle-vid</yt:videoId>
                            <title>unclosed title tag
                            <author><name>Sky Sport F1</name><uri>https://www.youtube.com/@skysportf1</uri></author>
                            <published>2026-03-01T16:00:00+00:00</published>
                          </entry>
                        </feed>
                        """),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal)
                || uri.Contains("/results?search_query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("no renderers"),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);

        // Race with DetailUrl=null → DeriveSeasonYear hits the null-DetailUrl path,
        // and BuildRaceMatchTerms gets null for the last value in the array.
        var raceNullDetail = new WeekendDocument(
            "finished-race",
            "Australia",
            "FORMULA 1 AUSTRALIAN GRAND PRIX 2026",
            1,
            "01 - 03 MAR",
            null!,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "",
            "",
            "",
            "");

        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(raceNullDetail, CancellationToken.None);
        Assert.Equal("missing", result.HighlightsLookupStatus);
    }

    [Fact]
    public async Task Highlights_lookup_service_returns_missing_when_global_search_transport_throws()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("no renderers here"),
                };
            }

            if (uri.Contains("/results?search_query=", StringComparison.Ordinal))
            {
                throw new HttpRequestException("network down");
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal(string.Empty, result.HighlightsVideoUrl);
        Assert.Equal("missing", result.HighlightsLookupStatus);
        Assert.Equal(string.Empty, result.HighlightsLookupSource);
    }

    [Fact]
    public void Highlights_lookup_service_private_helpers_cover_unclosed_json_blocks()
    {
        var malformedRenderer = "{\"videoRenderer\":{\"videoId\":\"broken-json\"";

        var renderers = InvokePrivateStaticMethod<IEnumerable<JsonElement>>(
            typeof(RaceHighlightsLookupService),
            "ExtractJsonVideoRenderers",
            malformedRenderer);
        var matchingBraceIndex = InvokePrivateStaticMethod<int>(
            typeof(RaceHighlightsLookupService),
            "FindMatchingBraceIndex",
            malformedRenderer,
            0);

        Assert.Empty(renderers);
        Assert.Equal(-1, matchingBraceIndex);
    }

    [Fact]
    public void Highlights_lookup_service_private_markup_parser_prefers_direct_video_id_and_rejects_unsupported_title_shape()
    {
        using var httpClient = new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)));
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));
        var rawContent =
            """{"videoRenderer":{"videoId":"direct-video-id","title":{"unexpected":"value"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"watch-endpoint-id"}}}}""";

        var candidates = InvokePrivateInstanceMethod<IReadOnlyList<object>>(
            service,
            "ExtractCandidatesFromMarkup",
            rawContent,
            "channel-search",
            "Sky Sport F1",
            "https://www.youtube.com/@skysportf1");

        var candidate = Assert.Single(candidates);
        var candidateType = candidate.GetType();

        Assert.Equal("direct-video-id", candidateType.GetProperty("VideoId")!.GetValue(candidate));
        Assert.Equal("https://www.youtube.com/watch?v=direct-video-id", candidateType.GetProperty("VideoUrl")!.GetValue(candidate));
        Assert.Equal(string.Empty, candidateType.GetProperty("Title")!.GetValue(candidate));
    }

    [Fact]
    public async Task Highlights_lookup_service_returns_missing_when_oembed_json_is_invalid()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"videoRenderer":{"videoId":"invalid-oembed-json","title":{"simpleText":"F1 GP Australia highlights 2026"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"invalid-oembed-json"}}}}"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{ invalid json"),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal(string.Empty, result.HighlightsVideoUrl);
        Assert.Equal("missing", result.HighlightsLookupStatus);
    }

    [Fact]
    public async Task Highlights_lookup_service_uses_end_date_when_start_date_is_invalid()
    {
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0" encoding="UTF-8"?>
                        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
                          <entry>
                            <yt:videoId>end-date-fallback</yt:videoId>
                            <title>F1, GP d'Australia, gli highlights della gara 2026</title>
                            <author><name>Sky Sport F1</name><uri>https://www.youtube.com/@skysportf1</uri></author>
                            <published>2026-03-01T16:00:00+00:00</published>
                          </entry>
                        </feed>
                        """),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1, GP d'Australia, gli highlights della gara 2026","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));
        var race = CreateWeekend() with
        {
            StartDate = "not-a-date",
            EndDate = "2026-03-01T15:00:00Z",
        };

        var result = await service.ResolveAsync(race, CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=end-date-fallback", result.HighlightsVideoUrl);
        Assert.Equal("found", result.HighlightsLookupStatus);
    }

    [Fact]
    public void Highlights_lookup_service_private_markup_parser_covers_short_byline_and_default_author_fallback()
    {
        using var httpClient = new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)));
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));
        var rawContent =
            """
            {"videoRenderer":{"videoId":"short-byline-video","title":{"simpleText":"F1 GP Australia highlights 2026"},"shortBylineText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"short-byline-video"}}}}
            {"videoRenderer":{"videoId":"default-author-video","title":{"simpleText":"F1 GP Australia highlights 2026"},"navigationEndpoint":{"watchEndpoint":{"videoId":"default-author-video"}}}}
            """;

        var candidates = InvokePrivateInstanceMethod<IReadOnlyList<object>>(
            service,
            "ExtractCandidatesFromMarkup",
            rawContent,
            "channel-search",
            "Default Sky Sport F1",
            "https://www.youtube.com/@skysportf1");

        Assert.Equal(2, candidates.Count);
        Assert.Equal("Sky Sport F1", candidates[0].GetType().GetProperty("AuthorName")!.GetValue(candidates[0]));
        Assert.Equal("Default Sky Sport F1", candidates[1].GetType().GetProperty("AuthorName")!.GetValue(candidates[1]));
    }

    [Fact]
    public void Highlights_lookup_service_private_build_search_query_handles_empty_title_seed()
    {
        var race = new WeekendDocument(
            "",
            null!,
            null!,
            1,
            "01 - 03 MAR",
            null!,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "",
            "",
            "",
            "");

        var query = InvokePrivateStaticMethod<string>(
            typeof(RaceHighlightsLookupService),
            "BuildSearchQuery",
            race);

        Assert.Equal("highlights Sky Sport F1", query);
    }

    [Fact]
    public void Highlights_lookup_service_private_build_search_queries_falls_back_to_default_query_when_all_seeds_are_empty()
    {
        var race = new WeekendDocument(
            "",
            null!,
            null!,
            1,
            "01 - 03 MAR",
            null!,
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "",
            "",
            "",
            "");

        var queries = InvokePrivateStaticMethod<IReadOnlyList<string>>(
            typeof(RaceHighlightsLookupService),
            "BuildSearchQueries",
            race);

        var query = Assert.Single(queries);
        Assert.Equal("highlights Sky Sport F1", query);
    }

    [Fact]
    public void Highlights_lookup_service_private_build_search_query_prefers_compact_meeting_seed_and_live_publisher_label()
    {
        var race = CreateWeekend();

        var query = InvokePrivateStaticMethod<string>(
            typeof(RaceHighlightsLookupService),
            "BuildSearchQuery",
            race);

        Assert.Equal("Australia 2026 highlights Sky Sport F1", query);
    }

    [Fact]
    public void Highlights_lookup_service_private_build_search_query_falls_back_to_detail_slug_when_meeting_name_is_missing()
    {
        var race = CreateWeekend() with
        {
            MeetingName = null,
            DetailUrl = "https://www.formula1.com/en/racing/2026/china",
        };

        var query = InvokePrivateStaticMethod<string>(
            typeof(RaceHighlightsLookupService),
            "BuildSearchQuery",
            race);

        Assert.Equal("china 2026 highlights Sky Sport F1", query);
    }

    [Fact]
    public void Highlights_lookup_service_private_build_search_query_falls_back_to_grand_prix_title_when_other_seeds_are_empty()
    {
        var race = CreateWeekend() with
        {
            MeetingName = null,
            DetailUrl = null,
            MeetingKey = string.Empty,
            GrandPrixTitle = "FORMULA 1 AUSTRALIAN GRAND PRIX 2026",
        };

        var query = InvokePrivateStaticMethod<string>(
            typeof(RaceHighlightsLookupService),
            "BuildSearchQuery",
            race);

        Assert.Equal("FORMULA 1 AUSTRALIAN GRAND PRIX 2026 2026 highlights Sky Sport F1", query);
    }

    [Fact]
    public void Highlights_lookup_service_private_build_search_queries_include_localized_aliases_without_duplicate_identical_seeds()
    {
        var race = CreateWeekend() with
        {
            MeetingName = "China",
            MeetingKey = "china",
            DetailUrl = "https://www.formula1.com/en/racing/2026/china",
            GrandPrixTitle = "FORMULA 1 CHINESE GRAND PRIX 2026",
        };

        var queries = InvokePrivateStaticMethod<IReadOnlyList<string>>(
            typeof(RaceHighlightsLookupService),
            "BuildSearchQueries",
            race);

        Assert.Contains("China 2026 highlights Sky Sport F1", queries);
        Assert.Contains("china 2026 highlights Sky Sport F1", queries);
        Assert.Contains("Cina 2026 highlights Sky Sport F1", queries);
        Assert.Single(queries, query => string.Equals(query, "china 2026 highlights Sky Sport F1", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Highlights_lookup_service_uses_compact_channel_search_query_for_live_sky_sport_f1_catalog()
    {
        var requestedUris = new List<string>();
        var handler = new RecordingHttpMessageHandler(request =>
        {
            requestedUris.Add(request.RequestUri!.AbsoluteUri);

            if (request.RequestUri!.AbsoluteUri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(httpClient, new StubClock(new DateTimeOffset(2026, 03, 01, 18, 00, 00, TimeSpan.Zero)), new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var result = await service.ResolveAsync(CreateWeekend(), CancellationToken.None);

        Assert.Equal("missing", result.HighlightsLookupStatus);
        Assert.Contains(
            "https://www.youtube.com/@skysportf1/search?query=Australia%202026%20highlights%20Sky%20Sport%20F1",
            requestedUris);
    }

    [Fact]
    public async Task Highlights_lookup_service_uses_the_injected_clock_year_when_the_race_does_not_expose_a_season_year()
    {
        var requestedUris = new List<string>();
        var handler = new RecordingHttpMessageHandler(request =>
        {
            var uri = request.RequestUri!.AbsoluteUri;
            requestedUris.Add(uri);

            if (uri.Contains("/feeds/videos.xml?channel_id=", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"></feed>"""),
                };
            }

            if (uri.Contains("/@skysportf1/search?query=Australia%202030%20highlights%20Sky%20Sport%20F1", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"contents":[{"videoRenderer":{"videoId":"clock-year-vid","title":{"simpleText":"F1, GP Australia, highlights gara 2030"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"clock-year-vid"}}}}]}"""),
                };
            }

            if (uri.Contains("/oembed?", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        """{"title":"F1, GP Australia, highlights gara 2030","author_name":"Sky Sport F1","author_url":"https://www.youtube.com/@skysportf1"}"""),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });
        using var httpClient = new HttpClient(handler);
        var service = new RaceHighlightsLookupService(
            httpClient,
            new StubClock(new DateTimeOffset(2030, 03, 01, 18, 00, 00, TimeSpan.Zero)),
            new RaceHighlightsLookupPolicy(TimeSpan.FromHours(1)));

        var race = CreateWeekend() with
        {
            MeetingName = "Australia",
            GrandPrixTitle = "FORMULA 1 AUSTRALIAN GRAND PRIX",
            DetailUrl = "https://www.formula1.com/en/racing/australia",
        };

        var result = await service.ResolveAsync(race, CancellationToken.None);

        Assert.Equal("https://www.youtube.com/watch?v=clock-year-vid", result.HighlightsVideoUrl);
        Assert.Contains(
            "https://www.youtube.com/@skysportf1/search?query=Australia%202030%20highlights%20Sky%20Sport%20F1",
            requestedUris);
    }

    private static WeekendDocument CreateWeekend()
    {
        return new WeekendDocument(
            "finished-race",
            "Australia",
            "FORMULA 1 AUSTRALIAN GRAND PRIX 2026",
            1,
            "01 - 03 MAR",
            "https://www.formula1.com/en/racing/2026/australia",
            null,
            null,
            false,
            "2026-03-01",
            "2026-03-01",
            "2026-03-01T14:00:00Z",
            [],
            "",
            "",
            "",
            "");
    }

    private sealed class StubClock : IClock
    {
        public StubClock(DateTimeOffset utcNow)
        {
            UtcNow = utcNow;
        }

        public DateTimeOffset UtcNow { get; }
    }

    private sealed class RecordingHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public RecordingHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(_handler(request));
        }
    }

    private static T InvokePrivateInstanceMethod<T>(object instance, string methodName, params object?[] arguments)
    {
        var method = instance.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.NonPublic)!;
        var result = method.Invoke(instance, arguments);

        if (result is T typedResult)
        {
            return typedResult;
        }

        if (result is System.Collections.IEnumerable enumerable && typeof(T) == typeof(IReadOnlyList<object>))
        {
            return (T)(object)enumerable.Cast<object>().ToArray();
        }

        throw new InvalidOperationException($"Unexpected result type for {methodName}.");
    }

    private static T InvokePrivateStaticMethod<T>(Type type, string methodName, params object?[] arguments)
    {
        var method = type.GetMethod(methodName, BindingFlags.Static | BindingFlags.NonPublic)!;
        var result = method.Invoke(null, arguments);

        if (result is T typedResult)
        {
            return typedResult;
        }

        throw new InvalidOperationException($"Unexpected result type for {methodName}.");
    }
}
