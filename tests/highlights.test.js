import { describe, expect, it, vi } from 'vitest';
import {
  ChannelSearchHighlightsSourceStrategy,
  ChannelVideosHighlightsSourceStrategy,
  FeedHighlightsSourceStrategy,
  GlobalSearchHighlightsSourceStrategy,
  HighlightsCandidateRanker,
  HighlightsLookupPolicy,
  HighlightsQueryBuilder,
  HighlightsResolver,
  HighlightsValidationService,
} from '../backend/highlights.js';

function createFetchResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

describe('highlights query builder', () => {
  it('uses the selected race season year instead of the runtime year when building the search query', () => {
    const queryBuilder = new HighlightsQueryBuilder({
      highlightsRaceAliases: {
        australia: ['melbourne'],
      },
      publisherLabel: 'Sky Sport Italia F1',
    });

    expect(
      queryBuilder.buildSearchQuery({
        meetingName: 'Australia',
        detailUrl: 'https://www.formula1.com/en/racing/2025/australia',
      }),
    ).toContain('2025');
  });

  it('falls back to the grand prix title year when the detail URL is missing', () => {
    const queryBuilder = new HighlightsQueryBuilder({
      highlightsRaceAliases: {},
      publisherLabel: 'Sky Sport Italia F1',
    });

    expect(
      queryBuilder.buildSearchQuery({
        meetingName: 'Australia',
        grandPrixTitle: 'FORMULA 1 AUSTRALIAN GRAND PRIX 2024',
      }),
    ).toContain('2024');
  });

  it('falls back to the meeting name year when neither detail URL nor grand prix title provide a season year', () => {
    const queryBuilder = new HighlightsQueryBuilder({
      highlightsRaceAliases: {},
      publisherLabel: 'Sky Sport Italia F1',
    });

    expect(
      queryBuilder.buildSearchQuery({
        meetingName: 'Australia 2023',
      }),
    ).toContain('2023');
  });
});

describe('highlights ranking and policy', () => {
  it('prefers the candidate from the matching race season when multiple Sky Sport F1 videos exist', () => {
    const queryBuilder = new HighlightsQueryBuilder({
      highlightsRaceAliases: {
        australia: ['melbourne'],
      },
      publisherLabel: 'Sky Sport Italia F1',
    });
    const ranker = new HighlightsCandidateRanker({
      queryBuilder,
      highlightsPositiveKeywords: ['gli highlights', 'highlights gara', 'highlights'],
      highlightsSecondaryKeywords: ['sintesi'],
      highlightsRequiredKeywords: ['highlight', 'highlights', 'sintesi'],
      highlightsNegativeKeywords: ['intervista', 'qualifiche'],
      highlightsPublisherKeywords: ['sky sport f1'],
      highlightsChannelHandle: '@skysportf1',
      highlightsChannelId: 'UCMQ7Gx6v-pQy_gsRoMJYzOA',
    });
    const race = {
      meetingName: 'Australia',
      grandPrixTitle: 'FORMULA 1 AUSTRALIAN GRAND PRIX 2025',
      detailUrl: 'https://www.formula1.com/en/racing/2025/australia',
    };

    const sorted = ranker.sortCandidates(
      [
        {
          videoUrl: 'https://www.youtube.com/watch?v=wrong-year',
          title: "F1, GP d'Australia, gli highlights della gara 2026",
          authorName: 'Sky Sport F1',
          authorUrl: 'https://www.youtube.com/@skysportf1',
          source: 'channel-search',
        },
        {
          videoUrl: 'https://www.youtube.com/watch?v=correct-year',
          title: "F1, GP d'Australia, gli highlights della gara 2025",
          authorName: 'Sky Sport F1',
          authorUrl: 'https://www.youtube.com/@skysportf1',
          source: 'channel-search',
        },
      ],
      race,
    );

    expect(sorted[0].videoUrl).toBe('https://www.youtube.com/watch?v=correct-year');
  });

  it('uses the missing lookup TTL before retrying a finished race without highlights', () => {
    const lookupPolicy = new HighlightsLookupPolicy({
      missingTtlMs: 6 * 60 * 60 * 1000,
      nowProvider: () => Date.parse('2026-03-08T12:00:00Z'),
    });

    expect(
      lookupPolicy.shouldLookup({
        endDate: '2026-03-01',
        highlightsVideoUrl: '',
        highlightsLookupStatus: 'missing',
        highlightsLookupCheckedAt: '2026-03-08T08:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('normalizes string timestamps when building lookup metadata', () => {
    const lookupPolicy = new HighlightsLookupPolicy({
      missingTtlMs: 6 * 60 * 60 * 1000,
      nowProvider: () => Date.parse('2026-03-08T12:00:00Z'),
    });

    expect(
      lookupPolicy.buildLookupResult({
        now: '2026-03-08T10:15:00.000Z',
        highlightsLookupStatus: 'missing',
      }),
    ).toEqual({
      highlightsVideoUrl: '',
      highlightsLookupCheckedAt: '2026-03-08T10:15:00.000Z',
      highlightsLookupStatus: 'missing',
      highlightsLookupSource: '',
    });
  });

  it('uses the default now provider when none is injected', () => {
    const lookupPolicy = new HighlightsLookupPolicy();

    expect(
      lookupPolicy.buildLookupResult({
        highlightsLookupStatus: 'missing',
      }),
    ).toEqual(
      expect.objectContaining({
        highlightsVideoUrl: '',
        highlightsLookupStatus: 'missing',
        highlightsLookupSource: '',
      }),
    );
  });
});

describe('highlights resolver', () => {
  it('uses source fallback order and returns the validated candidate with lookup metadata', async () => {
    const queryBuilder = new HighlightsQueryBuilder({
      highlightsRaceAliases: {
        australia: ['melbourne'],
      },
      publisherLabel: 'Sky Sport Italia F1',
    });
    const ranker = new HighlightsCandidateRanker({
      queryBuilder,
      highlightsPositiveKeywords: ['gli highlights', 'highlights gara', 'highlights'],
      highlightsSecondaryKeywords: ['sintesi'],
      highlightsRequiredKeywords: ['highlight', 'highlights', 'sintesi'],
      highlightsNegativeKeywords: ['intervista', 'qualifiche'],
      highlightsPublisherKeywords: ['sky sport f1'],
      highlightsChannelHandle: '@skysportf1',
      highlightsChannelId: 'UCMQ7Gx6v-pQy_gsRoMJYzOA',
    });
    const resolver = new HighlightsResolver({
      ranker,
      lookupPolicy: new HighlightsLookupPolicy({
        missingTtlMs: 6 * 60 * 60 * 1000,
        nowProvider: () => Date.parse('2026-03-08T12:00:00Z'),
      }),
      fetchImpl: vi.fn((url) => {
        if (String(url).includes('/oembed?') && String(url).includes('resolved-video')) {
          return createFetchResponse(
            JSON.stringify({
              title: "F1, GP d'Australia, gli highlights della gara 2025",
              author_name: 'Sky Sport F1',
              author_url: 'https://www.youtube.com/@skysportf1',
            }),
          );
        }

        return Promise.reject(new Error(`Unexpected URL ${url}`));
      }),
      oEmbedBaseUrl: 'https://www.youtube.com/oembed?format=json&url=',
      strategies: [
        {
          name: 'feed',
          loadCandidates: async () => [],
        },
        {
          name: 'channel-search',
          loadCandidates: async () => [
            {
              videoUrl: 'https://www.youtube.com/watch?v=resolved-video',
              title: "F1, GP d'Australia, gli highlights della gara 2025",
              authorName: 'Sky Sport F1',
              authorUrl: 'https://www.youtube.com/@skysportf1',
              source: 'channel-search',
            },
          ],
        },
      ],
    });

    await expect(
      resolver.resolve({
        meetingName: 'Australia',
        grandPrixTitle: 'FORMULA 1 AUSTRALIAN GRAND PRIX 2025',
        detailUrl: 'https://www.formula1.com/en/racing/2025/australia',
        endDate: '2025-03-16',
      }),
    ).resolves.toEqual({
      highlightsVideoUrl: 'https://www.youtube.com/watch?v=resolved-video',
      highlightsLookupCheckedAt: '2026-03-08T12:00:00.000Z',
      highlightsLookupStatus: 'found',
      highlightsLookupSource: 'channel-search',
    });
  });

  it('falls back to a generated Date-based nowProvider when the lookup policy does not expose one', async () => {
    const validationService = new HighlightsValidationService({
      ranker: {
        sortCandidates: () => [],
        isPublisherMatch: () => true,
        buildCandidateScore: () => 1,
      },
    });
    const resolver = new HighlightsResolver({
      strategies: [],
      validationService,
      lookupPolicy: {
        buildLookupResult: ({ now, highlightsLookupStatus = '' }) => ({
          highlightsVideoUrl: '',
          highlightsLookupCheckedAt: String(now instanceof Date),
          highlightsLookupStatus,
          highlightsLookupSource: '',
        }),
      },
    });

    await expect(resolver.resolve(null)).resolves.toEqual({
      highlightsVideoUrl: '',
      highlightsLookupCheckedAt: 'true',
      highlightsLookupStatus: 'missing',
      highlightsLookupSource: '',
    });
  });
});

describe('highlights source strategies', () => {
  it('returns parsed feed candidates when the channel feed is available', async () => {
    const strategy = new FeedHighlightsSourceStrategy({
      feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=test',
    });

    await expect(
      strategy.loadCandidates({}, {
        fetchHtmlImpl: async () =>
          `<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom"><entry><yt:videoId>feed-video</yt:videoId><title>F1, GP d'Australia, highlights 2025</title><link rel="alternate" href="https://www.youtube.com/watch?v=feed-video" /><author><name>Sky Sport F1</name><uri>https://www.youtube.com/@skysportf1</uri></author><published>2025-03-16T10:00:00+00:00</published></entry></feed>`,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        videoUrl: 'https://www.youtube.com/watch?v=feed-video',
        source: 'feed',
      }),
    ]);
  });

  it('loads candidates from the channel search page using the query builder', async () => {
    const strategy = new ChannelSearchHighlightsSourceStrategy({
      searchBaseUrl: 'https://www.youtube.com/@skysportf1/search?query=',
      channelHandle: '@skysportf1',
      queryBuilder: new HighlightsQueryBuilder({
        highlightsRaceAliases: {},
        publisherLabel: 'Sky Sport Italia F1',
      }),
    });

    await expect(
      strategy.loadCandidates(
        {
          meetingName: 'Australia',
          detailUrl: 'https://www.formula1.com/en/racing/2025/australia',
        },
        {
          fetchHtmlImpl: async (url) => {
            expect(String(url)).toContain('2025');
            return `{"contents":[{"videoRenderer":{"videoId":"channel-search-video","title":{"simpleText":"F1, GP d'Australia, highlights 2025"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"channel-search-video"}}}}]}`;
          },
        },
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        videoUrl: 'https://www.youtube.com/watch?v=channel-search-video',
        source: 'channel-search',
      }),
    ]);
  });

  it('loads candidates from the channel videos page and follows continuation payloads', async () => {
    const strategy = new ChannelVideosHighlightsSourceStrategy({
      videosUrl: 'https://www.youtube.com/@skysportf1/videos',
      channelHandle: '@skysportf1',
      maxPages: 2,
    });

    await expect(
      strategy.loadCandidates(
        {},
        {
          fetchHtmlImpl: async () => `
            <script>
              var ytInitialData = {"contents":[{"videoRenderer":{"videoId":"page-one-video","title":{"simpleText":"F1, GP d'Australia, highlights 2025"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"page-one-video"}}}}],"continuationCommand":{"token":"next-token"}};
            </script>
            <script>
              var ytcfg = {"INNERTUBE_API_KEY":"api-key","INNERTUBE_CLIENT_VERSION":"client-version"};
            </script>
          `,
          fetchImpl: (url) => {
            expect(String(url)).toContain('youtubei/v1/browse?key=api-key');
            return createFetchResponse(
              '{"onResponseReceivedActions":[{"appendContinuationItemsAction":{"continuationItems":[{"videoRenderer":{"videoId":"page-two-video","title":{"simpleText":"F1, GP d\\u0027Australia, highlights 2025"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"page-two-video"}}}}]}}]}',
            );
          },
        },
      ),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          videoUrl: 'https://www.youtube.com/watch?v=page-one-video',
          source: 'channel-videos',
        }),
        expect.objectContaining({
          videoUrl: 'https://www.youtube.com/watch?v=page-two-video',
          source: 'channel-videos',
        }),
      ]),
    );
  });

  it('loads candidates from the global search fallback', async () => {
    const strategy = new GlobalSearchHighlightsSourceStrategy({
      searchBaseUrl: 'https://www.youtube.com/results?search_query=',
      queryBuilder: new HighlightsQueryBuilder({
        highlightsRaceAliases: {},
        publisherLabel: 'Sky Sport Italia F1',
      }),
    });

    await expect(
      strategy.loadCandidates(
        {
          meetingName: 'Australia',
          detailUrl: 'https://www.formula1.com/en/racing/2025/australia',
        },
        {
          fetchHtmlImpl: async (url) => {
            expect(String(url)).toContain('Sky%20Sport%20Italia%20F1');
            return `{"contents":[{"videoRenderer":{"videoId":"global-search-video","title":{"simpleText":"F1, GP d'Australia, highlights 2025"},"ownerText":{"simpleText":"Sky Sport F1"},"navigationEndpoint":{"watchEndpoint":{"videoId":"global-search-video"}}}}]}`;
          },
        },
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        videoUrl: 'https://www.youtube.com/watch?v=global-search-video',
        source: 'global-search',
      }),
    ]);
  });
});
