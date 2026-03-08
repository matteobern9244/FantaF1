import { appConfig, currentYear, getBrowserHeaders } from './config.js';

const youtubeSearchBaseUrl = appConfig.calendarSource.highlightsSearchBaseUrl;
const highlightsPublisherKeywords = appConfig.calendarSource.highlightsPublisherKeywords;
const highlightsRequiredKeywords = appConfig.calendarSource.highlightsRequiredKeywords;
const highlightsPositiveKeywords = appConfig.calendarSource.highlightsPositiveKeywords;
const highlightsSecondaryKeywords = appConfig.calendarSource.highlightsSecondaryKeywords;
const highlightsNegativeKeywords = appConfig.calendarSource.highlightsNegativeKeywords;
const highlightsChannelHandle = appConfig.calendarSource.highlightsChannelHandle;
const highlightsChannelId = appConfig.calendarSource.highlightsChannelId;
const highlightsChannelSearchBaseUrl = appConfig.calendarSource.highlightsChannelSearchBaseUrl;
const highlightsChannelVideosUrl = appConfig.calendarSource.highlightsChannelVideosUrl;
const highlightsFeedUrl = appConfig.calendarSource.highlightsFeedUrl;
const highlightsOEmbedBaseUrl = appConfig.calendarSource.highlightsOEmbedBaseUrl;
const highlightsLookupMissingTtlMs =
  Number(appConfig.calendarSource.highlightsLookupMissingTtlHours) * 60 * 60 * 1000;
const highlightsLookupMaxVideoPages = Number(appConfig.calendarSource.highlightsLookupMaxVideoPages);
const highlightsSearchPublisherLabel = appConfig.calendarSource.highlightsSearchPublisherLabel;

function decodeHtmlEntities(value = '') {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&nbsp;', ' ');
}

function normalizeText(value = '') {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLookupText(value = '') {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenizeLookupTerms(value = '') {
  return normalizeLookupText(value)
    .split(/[^a-z0-9]+/i)
    .filter(
      (token) =>
        token.length >= 3 &&
        !/^\d+$/.test(token) &&
        !['grand', 'prix', 'formula'].includes(token),
    );
}

function normalizeYoutubeWatchUrl(href = '') {
  const value = String(href).trim();
  const watchMatch = value.match(/(?:https:\/\/www\.youtube\.com)?\/watch\?v=([A-Za-z0-9_-]{6,})/i);
  const shortMatch = value.match(/(?:https:\/\/www\.youtube\.com)?\/shorts\/([A-Za-z0-9_-]{6,})/i);

  if (watchMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${watchMatch[1]}`;
  }

  if (shortMatch?.[1]) {
    return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
  }

  return '';
}

function extractRendererText(value) {
  if (typeof value?.simpleText === 'string') {
    return normalizeText(value.simpleText);
  }

  if (Array.isArray(value?.runs)) {
    return normalizeText(value.runs.map((run) => run?.text ?? '').join(' '));
  }

  return '';
}

function findMatchingBraceIndex(value, startIndex) {
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractJsonVideoRenderers(rawContent = '') {
  const content = String(rawContent);
  const renderers = [];
  const pattern = /{"videoRenderer":{/g;

  for (const match of content.matchAll(pattern)) {
    const startIndex = match.index;
    /* v8 ignore next 3 */
    if (typeof startIndex !== 'number' || startIndex < 0) {
      continue;
    }

    const endIndex = findMatchingBraceIndex(content, startIndex);
    if (endIndex < 0) {
      continue;
    }

    try {
      const parsedValue = JSON.parse(content.slice(startIndex, endIndex + 1));
      if (parsedValue?.videoRenderer) {
        renderers.push(parsedValue.videoRenderer);
      }
    } catch {
      // Ignore malformed candidate blocks and continue scanning.
    }
  }

  return renderers;
}

function buildHighlightsCandidate(renderer = {}, source = 'global-search') {
  const videoId = normalizeText(renderer?.videoId || renderer?.navigationEndpoint?.watchEndpoint?.videoId);
  const rawVideoUrl = renderer?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url || '';

  return {
    videoId,
    videoUrl: normalizeYoutubeWatchUrl(rawVideoUrl || (videoId ? `/watch?v=${videoId}` : '')),
    title: extractRendererText(renderer?.title),
    authorName: extractRendererText(renderer?.longBylineText || renderer?.ownerText || renderer?.shortBylineText),
    authorUrl: '',
    publishedAt: '',
    source,
  };
}

function extractHighlightsCandidatesFromMarkup(
  rawContent,
  source = 'global-search',
  defaultAuthorName = '',
  defaultAuthorUrl = '',
) {
  const jsonCandidates = extractJsonVideoRenderers(rawContent).map((renderer) => {
    const candidate = buildHighlightsCandidate(renderer, source);
    return {
      ...candidate,
      authorName: candidate.authorName || defaultAuthorName,
      authorUrl: defaultAuthorUrl,
    };
  });

  if (jsonCandidates.length > 0) {
    return jsonCandidates;
  }

  return [...String(rawContent).matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(([, href, anchorHtml]) => ({
      videoId: '',
      videoUrl: normalizeYoutubeWatchUrl(href),
      title: normalizeText(anchorHtml),
      authorName: defaultAuthorName,
      authorUrl: defaultAuthorUrl,
      publishedAt: '',
      source,
    }))
    .filter((candidate) => candidate.videoUrl);
}

function extractHighlightsCandidatesFromFeedXml(rawContent = '') {
  return [...String(rawContent).matchAll(/<entry>([\s\S]*?)<\/entry>/gi)]
    .map((match) => {
      const entry = match[1];
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] ?? '';
      const title = normalizeText(entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
      const authorName = normalizeText(entry.match(/<name>([\s\S]*?)<\/name>/i)?.[1] ?? '');
      const authorUrl = normalizeText(entry.match(/<uri>([\s\S]*?)<\/uri>/i)?.[1] ?? '');
      const publishedAt = normalizeText(entry.match(/<published>([\s\S]*?)<\/published>/i)?.[1] ?? '');

      return {
        videoId,
        videoUrl: normalizeYoutubeWatchUrl(`/watch?v=${videoId}`),
        title,
        authorName,
        authorUrl,
        publishedAt,
        source: 'feed',
      };
    })
    .filter((candidate) => candidate.videoUrl);
}

function extractInnertubeConfig(rawContent = '') {
  const content = String(rawContent);
  const apiKey = content.match(/INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ?? '';
  const clientVersion = content.match(/INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? '';

  return { apiKey, clientVersion };
}

function extractContinuationTokens(rawContent = '') {
  return [...String(rawContent).matchAll(/"continuationCommand":\{"token":"([^"]+)"/g)]
    .map((match) => match[1])
    .filter(Boolean);
}

async function fetchTextWithFetchImpl(url, {
  fetchImpl = fetch,
  method = 'GET',
  headers = {},
  body,
} = {}) {
  const response = await fetchImpl(url, { method, headers, body });

  if (!response || typeof response.ok !== 'boolean' || typeof response.text !== 'function') {
    throw new Error(`Invalid response received from ${url}`);
  }

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return response.text();
}

function defaultFetchHtml(url, headers = {}) {
  return fetchTextWithFetchImpl(url, { headers });
}

class HighlightsQueryBuilder {
  constructor({
    highlightsRaceAliases: raceAliases = {},
    publisherLabel = highlightsSearchPublisherLabel,
    fallbackSeasonYear = currentYear,
  } = {}) {
    this.highlightsRaceAliases = raceAliases;
    this.publisherLabel = publisherLabel;
    this.fallbackSeasonYear = fallbackSeasonYear;
  }

  deriveSeasonYear(race = {}) {
    const detailYear = String(race?.detailUrl ?? '').match(/\/racing\/(\d{4})\//i)?.[1];
    if (detailYear) {
      return detailYear;
    }

    const titleYear =
      String(race?.grandPrixTitle ?? '').match(/\b(20\d{2})\b/)?.[1] ??
      String(race?.meetingName ?? '').match(/\b(20\d{2})\b/)?.[1];

    if (titleYear) {
      return titleYear;
    }

    return String(this.fallbackSeasonYear);
  }

  extractSeasonYear(value = '') {
    return String(value).match(/\b(20\d{2})\b/)?.[1] ?? '';
  }

  buildRaceMatchTerms(race = {}) {
    const terms = new Set();
    const values = [
      race?.meetingName,
      race?.grandPrixTitle,
      race?.meetingKey,
      race?.detailUrl?.split('/').at(-1),
    ];

    values.forEach((value) => {
      const normalizedValue = normalizeLookupText(value);
      tokenizeLookupTerms(value).forEach((token) => terms.add(token));

      for (const [canonicalTerm, aliases] of Object.entries(this.highlightsRaceAliases)) {
        const normalizedCanonicalTerm = normalizeLookupText(canonicalTerm);
        if (!normalizedValue || !normalizedValue.includes(normalizedCanonicalTerm)) {
          continue;
        }

        tokenizeLookupTerms(canonicalTerm).forEach((token) => terms.add(token));
        aliases.forEach((alias) => {
          tokenizeLookupTerms(alias).forEach((token) => terms.add(token));
        });
      }
    });

    return [...terms];
  }

  buildSearchQuery(race = {}) {
    const titleSeed = normalizeText(race?.grandPrixTitle || race?.meetingName || race?.meetingKey || '');
    const seasonYear = titleSeed ? this.deriveSeasonYear(race) : '';
    return normalizeText(`${titleSeed} ${seasonYear} highlights ${this.publisherLabel}`);
  }
}

class HighlightsCandidateRanker {
  constructor({
    queryBuilder,
    highlightsPublisherKeywords: publisherKeywords = highlightsPublisherKeywords,
    highlightsRequiredKeywords: requiredKeywords = highlightsRequiredKeywords,
    highlightsPositiveKeywords: positiveKeywords = highlightsPositiveKeywords,
    highlightsSecondaryKeywords: secondaryKeywords = highlightsSecondaryKeywords,
    highlightsNegativeKeywords: negativeKeywords = highlightsNegativeKeywords,
    highlightsChannelHandle: channelHandle = highlightsChannelHandle,
    highlightsChannelId: channelId = highlightsChannelId,
  } = {}) {
    this.queryBuilder = queryBuilder;
    this.highlightsPublisherKeywords = publisherKeywords;
    this.highlightsRequiredKeywords = requiredKeywords;
    this.highlightsPositiveKeywords = positiveKeywords;
    this.highlightsSecondaryKeywords = secondaryKeywords;
    this.highlightsNegativeKeywords = negativeKeywords;
    this.highlightsChannelHandle = channelHandle;
    this.highlightsChannelId = channelId;
  }

  isPublisherMatch(value = '') {
    const normalizedValue = normalizeLookupText(value);
    return (
      this.highlightsPublisherKeywords.some((keyword) =>
        normalizedValue.includes(normalizeLookupText(keyword)),
      ) ||
      normalizedValue.includes(normalizeLookupText(this.highlightsChannelHandle)) ||
      normalizedValue.includes(normalizeLookupText(this.highlightsChannelId))
    );
  }

  hasRequiredKeyword(value = '') {
    const normalizedValue = normalizeLookupText(value);
    return this.highlightsRequiredKeywords.some((keyword) =>
      normalizedValue.includes(normalizeLookupText(keyword)),
    );
  }

  buildCandidateScore(candidate, race = {}) {
    const title = normalizeLookupText(candidate?.title);
    const author = normalizeLookupText(candidate?.authorName || candidate?.author || '');
    const authorUrl = normalizeLookupText(candidate?.authorUrl || '');
    const combinedSource = `${title} ${author} ${authorUrl}`;
    const raceMatchTerms = this.queryBuilder.buildRaceMatchTerms(race);
    const seasonYear = this.queryBuilder.deriveSeasonYear(race);
    const candidateSeasonYear = this.queryBuilder.extractSeasonYear(candidate?.title);

    if (!candidate?.videoUrl) {
      return Number.NEGATIVE_INFINITY;
    }

    if (candidate?.source === 'global-search' && !this.isPublisherMatch(combinedSource)) {
      return Number.NEGATIVE_INFINITY;
    }

    if (!raceMatchTerms.some((term) => title.includes(term))) {
      return Number.NEGATIVE_INFINITY;
    }

    if (candidateSeasonYear && seasonYear && candidateSeasonYear !== seasonYear) {
      return Number.NEGATIVE_INFINITY;
    }

    let score = 0;

    if (this.highlightsPositiveKeywords.some((keyword) => title.includes(normalizeLookupText(keyword)))) {
      score += 20;
    }

    if (this.hasRequiredKeyword(title)) {
      score += 8;
    }

    if (this.highlightsSecondaryKeywords.some((keyword) => title.includes(normalizeLookupText(keyword)))) {
      score += 6;
    }

    if (title.includes('gp')) {
      score += 3;
    }

    if (title.includes('gara') || title.includes('race')) {
      score += 2;
    }

    if (seasonYear && title.includes(seasonYear)) {
      score += 4;
    }

    score += raceMatchTerms.reduce((total, term) => total + (title.includes(term) ? 2 : 0), 0);

    if (this.highlightsNegativeKeywords.some((keyword) => title.includes(normalizeLookupText(keyword)))) {
      score -= 12;
    }

    if (candidate?.publishedAt) {
      const publishedAtValue = Date.parse(candidate.publishedAt);
      const raceStartValue = Date.parse(race?.startDate || race?.endDate || '');
      if (!Number.isNaN(publishedAtValue) && !Number.isNaN(raceStartValue) && publishedAtValue >= raceStartValue) {
        score += 1;
      }
    }

    return score;
  }

  sortCandidates(candidates, race = {}) {
    return candidates
      .map((candidate) => ({
        ...candidate,
        score: this.buildCandidateScore(candidate, race),
      }))
      .filter((candidate) => Number.isFinite(candidate.score) && candidate.score > 0)
      .sort((firstCandidate, secondCandidate) => {
        if (secondCandidate.score !== firstCandidate.score) {
          return secondCandidate.score - firstCandidate.score;
        }

        const firstPublishedAt = Date.parse(firstCandidate.publishedAt || '');
        const secondPublishedAt = Date.parse(secondCandidate.publishedAt || '');

        if (
          !Number.isNaN(secondPublishedAt) &&
          !Number.isNaN(firstPublishedAt) &&
          secondPublishedAt !== firstPublishedAt
        ) {
          return secondPublishedAt - firstPublishedAt;
        }

        return 0;
      });
  }
}

class HighlightsLookupPolicy {
  constructor({
    missingTtlMs = highlightsLookupMissingTtlMs,
    nowProvider = () => Date.now(),
  } = {}) {
    this.missingTtlMs = missingTtlMs;
    this.nowProvider = nowProvider;
  }

  resolveNow(now = this.nowProvider()) {
    if (now instanceof Date) {
      return now.getTime();
    }

    return typeof now === 'number' ? now : Date.parse(String(now));
  }

  shouldLookup(race = {}, now = this.nowProvider()) {
    if (normalizeText(race?.highlightsVideoUrl)) {
      return false;
    }

    const nowValue = this.resolveNow(now);
    const endDateValue = Date.parse(race?.endDate || race?.startDate || race?.raceStartTime || '');
    if (Number.isNaN(endDateValue)) {
      return false;
    }

    if (endDateValue > nowValue) {
      return false;
    }

    if (normalizeText(race?.highlightsLookupStatus) !== 'missing') {
      return true;
    }

    const checkedAtValue = Date.parse(race?.highlightsLookupCheckedAt || '');
    if (Number.isNaN(checkedAtValue)) {
      return true;
    }

    return checkedAtValue + this.missingTtlMs <= nowValue;
  }

  buildLookupResult({
    now = this.nowProvider(),
    highlightsVideoUrl = '',
    highlightsLookupStatus = '',
    highlightsLookupSource = '',
  } = {}) {
    const nowValue = this.resolveNow(now);
    return {
      highlightsVideoUrl: normalizeText(highlightsVideoUrl),
      highlightsLookupCheckedAt: new Date(nowValue).toISOString(),
      highlightsLookupStatus: normalizeText(highlightsLookupStatus),
      highlightsLookupSource: normalizeText(highlightsLookupSource),
    };
  }
}

class HighlightsValidationService {
  constructor({
    ranker,
    fetchImpl = fetch,
    oEmbedBaseUrl = highlightsOEmbedBaseUrl,
  } = {}) {
    this.ranker = ranker;
    this.fetchImpl = fetchImpl;
    this.oEmbedBaseUrl = oEmbedBaseUrl;
  }

  async validateCandidate(candidate, race, fetchImpl = this.fetchImpl) {
    /* v8 ignore next 3 */
    if (!candidate?.videoUrl || !this.oEmbedBaseUrl) {
      return null;
    }

    try {
      const oEmbedText = await fetchTextWithFetchImpl(
        `${this.oEmbedBaseUrl}${encodeURIComponent(candidate.videoUrl)}`,
        { fetchImpl, headers: getBrowserHeaders() },
      );
      const oEmbedPayload = JSON.parse(oEmbedText);
      const validatedCandidate = {
        ...candidate,
        title: oEmbedPayload.title || candidate.title,
        authorName: oEmbedPayload.author_name || candidate.authorName,
        authorUrl: oEmbedPayload.author_url || candidate.authorUrl,
      };

      return this.ranker.isPublisherMatch(
        `${validatedCandidate.authorName} ${validatedCandidate.authorUrl}`,
      ) && Number.isFinite(this.ranker.buildCandidateScore(validatedCandidate, race))
        ? validatedCandidate
        : null;
    } catch {
      return null;
    }
  }

  async validateCandidatesInOrder(candidates, race, fetchImpl = this.fetchImpl) {
    for (const candidate of this.ranker.sortCandidates(candidates, race)) {
      const validatedCandidate = await this.validateCandidate(candidate, race, fetchImpl);
      if (validatedCandidate?.videoUrl) {
        return validatedCandidate;
      }
    }

    return null;
  }
}

class FeedHighlightsSourceStrategy {
  constructor({ feedUrl = highlightsFeedUrl } = {}) {
    this.name = 'feed';
    this.feedUrl = feedUrl;
  }

  async loadCandidates(_race, { fetchHtmlImpl = defaultFetchHtml } = {}) {
    /* v8 ignore next 3 */
    if (!this.feedUrl) {
      return [];
    }

    const feedXml = await fetchHtmlImpl(this.feedUrl, getBrowserHeaders()).catch(() => '');
    return feedXml ? extractHighlightsCandidatesFromFeedXml(feedXml) : [];
  }
}

class ChannelSearchHighlightsSourceStrategy {
  constructor({
    searchBaseUrl = highlightsChannelSearchBaseUrl,
    channelHandle = highlightsChannelHandle,
    queryBuilder,
  } = {}) {
    this.name = 'channel-search';
    this.searchBaseUrl = searchBaseUrl;
    this.channelHandle = channelHandle;
    this.queryBuilder = queryBuilder;
  }

  async loadCandidates(race, { fetchHtmlImpl = defaultFetchHtml } = {}) {
    /* v8 ignore next 3 */
    if (!this.searchBaseUrl) {
      return [];
    }

    const channelSearchHtml = await fetchHtmlImpl(
      `${this.searchBaseUrl}${encodeURIComponent(this.queryBuilder.buildSearchQuery(race))}`,
      getBrowserHeaders(),
    ).catch(() => '');

    return channelSearchHtml
      ? extractHighlightsCandidatesFromMarkup(
          channelSearchHtml,
          this.name,
          'Sky Sport F1',
          `https://www.youtube.com/${this.channelHandle}`,
        )
      : [];
  }
}

class ChannelVideosHighlightsSourceStrategy {
  constructor({
    videosUrl = highlightsChannelVideosUrl,
    channelHandle = highlightsChannelHandle,
    maxPages = highlightsLookupMaxVideoPages,
  } = {}) {
    this.name = 'channel-videos';
    this.videosUrl = videosUrl;
    this.channelHandle = channelHandle;
    this.maxPages = maxPages;
  }

  async loadCandidates(_race, { fetchHtmlImpl = defaultFetchHtml, fetchImpl = fetch } = {}) {
    /* v8 ignore next 3 */
    if (!this.videosUrl) {
      return [];
    }

    const channelVideosHtml = await fetchHtmlImpl(this.videosUrl, getBrowserHeaders()).catch(() => '');
    if (!channelVideosHtml) {
      return [];
    }

    const candidates = extractHighlightsCandidatesFromMarkup(
      channelVideosHtml,
      this.name,
      'Sky Sport F1',
      `https://www.youtube.com/${this.channelHandle}`,
    );
    const { apiKey, clientVersion } = extractInnertubeConfig(channelVideosHtml);
    let continuationTokens = extractContinuationTokens(channelVideosHtml);
    let page = 1;

    while (continuationTokens.length > 0 && apiKey && clientVersion && page < this.maxPages) {
      const continuationToken = continuationTokens.shift();
      /* v8 ignore next 3 */
      if (!continuationToken) {
        break;
      }

      const continuationPayload = await fetchTextWithFetchImpl(
        `https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`,
        {
          fetchImpl,
          method: 'POST',
          headers: {
            ...getBrowserHeaders(),
            'content-type': 'application/json',
            'x-youtube-client-name': '1',
            'x-youtube-client-version': clientVersion,
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion,
              },
            },
            continuation: continuationToken,
          }),
        },
      ).catch(() => '');

      if (!continuationPayload) {
        break;
      }

      candidates.push(
        ...extractHighlightsCandidatesFromMarkup(
          continuationPayload,
          this.name,
          'Sky Sport F1',
          `https://www.youtube.com/${this.channelHandle}`,
        ),
      );
      continuationTokens = continuationTokens.concat(extractContinuationTokens(continuationPayload));
      page += 1;
    }

    return candidates;
  }
}

class GlobalSearchHighlightsSourceStrategy {
  constructor({
    searchBaseUrl = youtubeSearchBaseUrl,
    queryBuilder,
  } = {}) {
    this.name = 'global-search';
    this.searchBaseUrl = searchBaseUrl;
    this.queryBuilder = queryBuilder;
  }

  async loadCandidates(race, { fetchHtmlImpl = defaultFetchHtml } = {}) {
    /* v8 ignore next 3 */
    if (!this.searchBaseUrl) {
      return [];
    }

    const searchHtml = await fetchHtmlImpl(
      `${this.searchBaseUrl}${encodeURIComponent(this.queryBuilder.buildSearchQuery(race))}`,
      getBrowserHeaders(),
    ).catch(() => '');

    return searchHtml ? extractHighlightsCandidatesFromMarkup(searchHtml, this.name) : [];
  }
}

class HighlightsResolver {
  constructor({
    strategies = [],
    ranker,
    validationService,
    lookupPolicy,
    fetchImpl = fetch,
    fetchHtmlImpl = defaultFetchHtml,
    nowProvider,
  } = {}) {
    this.strategies = strategies;
    this.validationService =
      validationService ??
      new HighlightsValidationService({
        ranker,
        fetchImpl,
      });
    this.lookupPolicy = lookupPolicy;
    this.fetchImpl = fetchImpl;
    this.fetchHtmlImpl = fetchHtmlImpl;
    this.nowProvider = nowProvider ?? (() => this.lookupPolicy?.nowProvider?.() ?? new Date());
  }

  async resolve(race, options = {}) {
    const now = options.now ?? this.nowProvider();
    if (!race) {
      return this.lookupPolicy.buildLookupResult({
        now,
        highlightsLookupStatus: 'missing',
      });
    }

    const fetchImpl = options.fetchImpl ?? this.fetchImpl;
    const fetchHtmlImpl = options.fetchHtmlImpl ?? this.fetchHtmlImpl;

    for (const strategy of this.strategies) {
      const candidates = await strategy.loadCandidates(race, { fetchHtmlImpl, fetchImpl });
      const validatedCandidate = await this.validationService.validateCandidatesInOrder(
        candidates,
        race,
        fetchImpl,
      );

      if (validatedCandidate?.videoUrl) {
        return this.lookupPolicy.buildLookupResult({
          now,
          highlightsVideoUrl: validatedCandidate.videoUrl,
          highlightsLookupStatus: 'found',
          highlightsLookupSource: strategy.name,
        });
      }
    }

    return this.lookupPolicy.buildLookupResult({
      now,
      highlightsLookupStatus: 'missing',
    });
  }
}

function normalizeHighlightsLookupOptions(optionsOrFetchHtmlImpl = defaultFetchHtml) {
  if (typeof optionsOrFetchHtmlImpl === 'function') {
    return {
      fetchHtmlImpl: optionsOrFetchHtmlImpl,
      fetchImpl: fetch,
      now: new Date(),
    };
  }

  return {
    fetchHtmlImpl: optionsOrFetchHtmlImpl.fetchHtmlImpl ?? defaultFetchHtml,
    fetchImpl: optionsOrFetchHtmlImpl.fetchImpl ?? fetch,
    now: optionsOrFetchHtmlImpl.now ?? new Date(),
  };
}

const defaultQueryBuilder = new HighlightsQueryBuilder();
const defaultRanker = new HighlightsCandidateRanker({ queryBuilder: defaultQueryBuilder });
const defaultLookupPolicy = new HighlightsLookupPolicy();
const defaultValidationService = new HighlightsValidationService({ ranker: defaultRanker });
const defaultResolver = new HighlightsResolver({
  strategies: [
    new FeedHighlightsSourceStrategy(),
    new ChannelSearchHighlightsSourceStrategy({ queryBuilder: defaultQueryBuilder }),
    new ChannelVideosHighlightsSourceStrategy(),
    new GlobalSearchHighlightsSourceStrategy({ queryBuilder: defaultQueryBuilder }),
  ],
  validationService: defaultValidationService,
  lookupPolicy: defaultLookupPolicy,
});

function buildHighlightsSearchQuery(race = {}) {
  return defaultQueryBuilder.buildSearchQuery(race);
}

function extractHighlightsVideoUrlFromSearchHtml(rawContent, race = {}) {
  return defaultRanker.sortCandidates(extractHighlightsCandidatesFromMarkup(rawContent), race)[0]?.videoUrl ?? '';
}

function shouldLookupFinishedRaceHighlights(race = {}, now = Date.now()) {
  return defaultLookupPolicy.shouldLookup(race, now);
}

async function resolveSkySportHighlightsVideo(race, optionsOrFetchHtmlImpl = defaultFetchHtml) {
  const { fetchHtmlImpl, fetchImpl, now } = normalizeHighlightsLookupOptions(optionsOrFetchHtmlImpl);
  return defaultResolver.resolve(race, { fetchHtmlImpl, fetchImpl, now });
}

async function fetchHighlightsVideoUrl(race, optionsOrFetchHtmlImpl = defaultFetchHtml) {
  return (await resolveSkySportHighlightsVideo(race, optionsOrFetchHtmlImpl)).highlightsVideoUrl;
}

export {
  ChannelSearchHighlightsSourceStrategy,
  ChannelVideosHighlightsSourceStrategy,
  FeedHighlightsSourceStrategy,
  GlobalSearchHighlightsSourceStrategy,
  HighlightsCandidateRanker,
  HighlightsLookupPolicy,
  HighlightsQueryBuilder,
  HighlightsResolver,
  HighlightsValidationService,
  buildHighlightsSearchQuery,
  extractHighlightsVideoUrlFromSearchHtml,
  fetchHighlightsVideoUrl,
  normalizeYoutubeWatchUrl,
  resolveSkySportHighlightsVideo,
  shouldLookupFinishedRaceHighlights,
};
