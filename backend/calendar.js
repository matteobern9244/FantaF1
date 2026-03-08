import { appConfig, currentYear, formatConfigText, getBrowserHeaders } from './config.js';
import { readCalendarCache, writeCalendarCache } from './storage.js';

const MONTH_INDEX = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};
const RACE_RESULTS_CACHE_TTL_MS = 30_000;
const raceResultsCache = new Map();
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
const highlightsRaceAliases = appConfig.calendarSource.highlightsRaceAliases;

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

function toNameCase(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1).toLowerCase())
        .join('-'),
    )
    .join(' ');
}

function canonicalizeDriverName(name) {
  const normalizedName = toNameCase(name);
  return appConfig.driverAliases[normalizedName] ?? normalizedName;
}

function buildHighlightsSearchQuery(race = {}) {
  const titleSeed = normalizeText(race?.grandPrixTitle || race?.meetingName || race?.meetingKey || '');
  return normalizeText(`${titleSeed} highlights Sky Sport Italia F1`);
}

function normalizeLookupText(value = '') {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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

function buildRaceMatchTerms(race = {}) {
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

    for (const [canonicalTerm, aliases] of Object.entries(highlightsRaceAliases)) {
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

function isHighlightsPublisherMatch(value = '') {
  const normalizedValue = normalizeLookupText(value);
  return (
    highlightsPublisherKeywords.some((keyword) => normalizedValue.includes(normalizeLookupText(keyword))) ||
    normalizedValue.includes(normalizeLookupText(highlightsChannelHandle)) ||
    normalizedValue.includes(normalizeLookupText(highlightsChannelId))
  );
}

function hasHighlightsRequiredKeyword(value = '') {
  const normalizedValue = normalizeLookupText(value);
  return highlightsRequiredKeywords.some((keyword) => normalizedValue.includes(normalizeLookupText(keyword)));
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

function extractRendererText(value) {
  if (typeof value?.simpleText === 'string') {
    return normalizeText(value.simpleText);
  }

  if (Array.isArray(value?.runs)) {
    return normalizeText(value.runs.map((run) => run?.text ?? '').join(' '));
  }

  return '';
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

function extractHighlightsCandidatesFromMarkup(rawContent, source = 'global-search', defaultAuthorName = '', defaultAuthorUrl = '') {
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
  return [...String(rawContent).matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => {
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
  }).filter((candidate) => candidate.videoUrl);
}

function buildHighlightsCandidateScore(candidate, race = {}) {
  const title = normalizeLookupText(candidate?.title);
  const author = normalizeLookupText(candidate?.authorName || candidate?.author || '');
  const authorUrl = normalizeLookupText(candidate?.authorUrl || '');
  const combinedSource = `${title} ${author} ${authorUrl}`;
  const raceMatchTerms = buildRaceMatchTerms(race);

  if (!candidate?.videoUrl) {
    return Number.NEGATIVE_INFINITY;
  }

  if (candidate?.source === 'global-search' && !isHighlightsPublisherMatch(combinedSource)) {
    return Number.NEGATIVE_INFINITY;
  }

  if (!raceMatchTerms.some((term) => title.includes(term))) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;

  if (highlightsPositiveKeywords.some((keyword) => title.includes(normalizeLookupText(keyword)))) {
    score += 20;
  }

  if (hasHighlightsRequiredKeyword(title)) {
    score += 8;
  }

  if (highlightsSecondaryKeywords.some((keyword) => title.includes(normalizeLookupText(keyword)))) {
    score += 6;
  }

  if (title.includes('gp')) {
    score += 3;
  }

  if (title.includes('gara') || title.includes('race')) {
    score += 2;
  }

  score += raceMatchTerms.reduce((total, term) => total + (title.includes(term) ? 2 : 0), 0);

  if (highlightsNegativeKeywords.some((keyword) => title.includes(normalizeLookupText(keyword)))) {
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

function sortHighlightsCandidates(candidates, race = {}) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: buildHighlightsCandidateScore(candidate, race),
    }))
    .filter((candidate) => Number.isFinite(candidate.score) && candidate.score > 0)
    .sort((firstCandidate, secondCandidate) => {
      if (secondCandidate.score !== firstCandidate.score) {
        return secondCandidate.score - firstCandidate.score;
      }

      const firstPublishedAt = Date.parse(firstCandidate.publishedAt || '');
      const secondPublishedAt = Date.parse(secondCandidate.publishedAt || '');

      if (!Number.isNaN(secondPublishedAt) && !Number.isNaN(firstPublishedAt) && secondPublishedAt !== firstPublishedAt) {
        return secondPublishedAt - firstPublishedAt;
      }

      return 0;
    });
}

function extractHighlightsVideoUrlFromSearchHtml(rawContent, race = {}) {
  return sortHighlightsCandidates(extractHighlightsCandidatesFromMarkup(rawContent), race)[0]?.videoUrl ?? '';
}

function shouldLookupFinishedRaceHighlights(race = {}, now = Date.now()) {
  if (normalizeText(race?.highlightsVideoUrl)) {
    return false;
  }

  const endDateValue = Date.parse(race?.endDate || race?.startDate || race?.raceStartTime || '');
  if (Number.isNaN(endDateValue)) {
    return false;
  }

  if (endDateValue > now) {
    return false;
  }

  if (normalizeText(race?.highlightsLookupStatus) !== 'missing') {
    return true;
  }

  const checkedAtValue = Date.parse(race?.highlightsLookupCheckedAt || '');
  if (Number.isNaN(checkedAtValue)) {
    return true;
  }

  return checkedAtValue + highlightsLookupMissingTtlMs <= now;
}

function normalizeHighlightsLookupOptions(optionsOrFetchHtmlImpl = fetchHtml) {
  if (typeof optionsOrFetchHtmlImpl === 'function') {
    return {
      fetchHtmlImpl: optionsOrFetchHtmlImpl,
      fetchImpl: fetch,
      now: new Date(),
    };
  }

  return {
    fetchHtmlImpl: optionsOrFetchHtmlImpl.fetchHtmlImpl ?? fetchHtml,
    fetchImpl: optionsOrFetchHtmlImpl.fetchImpl ?? fetch,
    now: optionsOrFetchHtmlImpl.now ?? new Date(),
  };
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

async function validateHighlightsCandidate(candidate, race, fetchImpl = fetch) {
  /* v8 ignore next 3 */
  if (!candidate?.videoUrl || !highlightsOEmbedBaseUrl) {
    return null;
  }

  try {
    const oEmbedText = await fetchTextWithFetchImpl(
      `${highlightsOEmbedBaseUrl}${encodeURIComponent(candidate.videoUrl)}`,
      { fetchImpl, headers: getBrowserHeaders() },
    );
    const oEmbedPayload = JSON.parse(oEmbedText);
    const validatedCandidate = {
      ...candidate,
      title: oEmbedPayload.title || candidate.title,
      authorName: oEmbedPayload.author_name || candidate.authorName,
      authorUrl: oEmbedPayload.author_url || candidate.authorUrl,
    };

    return isHighlightsPublisherMatch(
      `${validatedCandidate.authorName} ${validatedCandidate.authorUrl}`,
    ) && Number.isFinite(buildHighlightsCandidateScore(validatedCandidate, race))
      ? validatedCandidate
      : null;
  } catch {
    return null;
  }
}

async function validateCandidatesInOrder(candidates, race, fetchImpl = fetch) {
  for (const candidate of sortHighlightsCandidates(candidates, race)) {
    const validatedCandidate = await validateHighlightsCandidate(candidate, race, fetchImpl);
    if (validatedCandidate?.videoUrl) {
      return validatedCandidate;
    }
  }

  return null;
}

async function fetchHighlightsCandidatesFromFeed(fetchHtmlImpl) {
  /* v8 ignore next 3 */
  if (!highlightsFeedUrl) {
    return [];
  }

  const feedXml = await fetchHtmlImpl(highlightsFeedUrl, getBrowserHeaders()).catch(() => '');
  return feedXml ? extractHighlightsCandidatesFromFeedXml(feedXml) : [];
}

async function fetchHighlightsCandidatesFromChannelSearch(race, fetchHtmlImpl) {
  /* v8 ignore next 3 */
  if (!highlightsChannelSearchBaseUrl) {
    return [];
  }

  const channelSearchHtml = await fetchHtmlImpl(
    `${highlightsChannelSearchBaseUrl}${encodeURIComponent(buildHighlightsSearchQuery(race))}`,
    getBrowserHeaders(),
  ).catch(() => '');

  return channelSearchHtml
    ? extractHighlightsCandidatesFromMarkup(
        channelSearchHtml,
        'channel-search',
        'Sky Sport F1',
        `https://www.youtube.com/${highlightsChannelHandle}`,
      )
    : [];
}

async function fetchHighlightsCandidatesFromChannelVideos(race, fetchHtmlImpl, fetchImpl) {
  /* v8 ignore next 3 */
  if (!highlightsChannelVideosUrl) {
    return [];
  }

  const channelVideosHtml = await fetchHtmlImpl(highlightsChannelVideosUrl, getBrowserHeaders()).catch(() => '');
  if (!channelVideosHtml) {
    return [];
  }

  const candidates = extractHighlightsCandidatesFromMarkup(
    channelVideosHtml,
    'channel-videos',
    'Sky Sport F1',
    `https://www.youtube.com/${highlightsChannelHandle}`,
  );
  const { apiKey, clientVersion } = extractInnertubeConfig(channelVideosHtml);
  let continuationTokens = extractContinuationTokens(channelVideosHtml);
  let page = 1;

  while (continuationTokens.length > 0 && apiKey && clientVersion && page < highlightsLookupMaxVideoPages) {
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
        'channel-videos',
        'Sky Sport F1',
        `https://www.youtube.com/${highlightsChannelHandle}`,
      ),
    );
    continuationTokens = continuationTokens.concat(extractContinuationTokens(continuationPayload));
    page += 1;
  }

  return candidates;
}

async function fetchHighlightsCandidatesFromGlobalSearch(race, fetchHtmlImpl) {
  /* v8 ignore next 3 */
  if (!youtubeSearchBaseUrl) {
    return [];
  }

  const searchHtml = await fetchHtmlImpl(
    `${youtubeSearchBaseUrl}${encodeURIComponent(buildHighlightsSearchQuery(race))}`,
    getBrowserHeaders(),
  ).catch(() => '');

  return searchHtml ? extractHighlightsCandidatesFromMarkup(searchHtml, 'global-search') : [];
}

async function resolveSkySportHighlightsVideo(race, optionsOrFetchHtmlImpl = fetchHtml) {
  const { fetchHtmlImpl, fetchImpl, now } = normalizeHighlightsLookupOptions(optionsOrFetchHtmlImpl);

  if (!race) {
    return {
      highlightsVideoUrl: '',
      highlightsLookupCheckedAt: new Date(now).toISOString(),
      highlightsLookupStatus: 'missing',
      highlightsLookupSource: '',
    };
  }

  const sourceLoaders = [
    ['feed', () => fetchHighlightsCandidatesFromFeed(fetchHtmlImpl)],
    ['channel-search', () => fetchHighlightsCandidatesFromChannelSearch(race, fetchHtmlImpl)],
    ['channel-videos', () => fetchHighlightsCandidatesFromChannelVideos(race, fetchHtmlImpl, fetchImpl)],
    ['global-search', () => fetchHighlightsCandidatesFromGlobalSearch(race, fetchHtmlImpl)],
  ];

  for (const [sourceName, loadCandidates] of sourceLoaders) {
    const candidates = await loadCandidates();
    const validatedCandidate = await validateCandidatesInOrder(candidates, race, fetchImpl);

    if (validatedCandidate?.videoUrl) {
      return {
        highlightsVideoUrl: validatedCandidate.videoUrl,
        highlightsLookupCheckedAt: new Date(now).toISOString(),
        highlightsLookupStatus: 'found',
        highlightsLookupSource: sourceName,
      };
    }
  }

  return {
    highlightsVideoUrl: '',
    highlightsLookupCheckedAt: new Date(now).toISOString(),
    highlightsLookupStatus: 'missing',
    highlightsLookupSource: '',
  };
}

async function fetchHighlightsVideoUrl(race, optionsOrFetchHtmlImpl = fetchHtml) {
  return (await resolveSkySportHighlightsVideo(race, optionsOrFetchHtmlImpl)).highlightsVideoUrl;
}

async function persistRaceHighlightsLookup(calendar, meetingKey, lookupPayload = {}) {
  if (!Array.isArray(calendar)) {
    return calendar;
  }

  const updatedCalendar = calendar.map((weekend) => {
    if (weekend?.meetingKey !== meetingKey) {
      return weekend;
    }

    return {
      ...weekend,
      highlightsVideoUrl: normalizeText(lookupPayload.highlightsVideoUrl),
      highlightsLookupCheckedAt: normalizeText(lookupPayload.highlightsLookupCheckedAt),
      highlightsLookupStatus: normalizeText(lookupPayload.highlightsLookupStatus),
      highlightsLookupSource: normalizeText(lookupPayload.highlightsLookupSource),
    };
  });

  await writeCalendarCache(updatedCalendar);
  return updatedCalendar;
}

async function persistRaceHighlightsVideoUrl(calendar, meetingKey, highlightsVideoUrl) {
  if (!Array.isArray(calendar) || !normalizeText(highlightsVideoUrl)) {
    return calendar;
  }

  return persistRaceHighlightsLookup(calendar, meetingKey, {
    highlightsVideoUrl,
    highlightsLookupCheckedAt: new Date().toISOString(),
    highlightsLookupStatus: 'found',
    highlightsLookupSource: 'legacy',
  });
}

function clearRaceResultsCache() {
  raceResultsCache.clear();
}

function getCachedRaceResults(meetingKey) {
  const cachedEntry = raceResultsCache.get(meetingKey);
  if (!cachedEntry) {
    return null;
  }

  if (Date.now() - cachedEntry.timestamp > RACE_RESULTS_CACHE_TTL_MS) {
    raceResultsCache.delete(meetingKey);
    return null;
  }

  return { ...cachedEntry.results };
}

function setCachedRaceResults(meetingKey, results) {
  raceResultsCache.set(meetingKey, {
    timestamp: Date.now(),
    results: { ...results },
  });

  return { ...results };
}

function buildOfficialResultsBaseUrl(detailUrl = '', meetingKey = '') {
  const trimmedDetailUrl = String(detailUrl).replace(/\/+$/, '');
  const trimmedMeetingKey = String(meetingKey).trim();
  const detailMatch = trimmedDetailUrl.match(
    /^https:\/\/www\.formula1\.com\/en\/racing\/(\d{4})\/([^/?#]+)$/i,
  );

  if (!detailMatch || !trimmedMeetingKey) {
    return '';
  }

  const [, year, slug] = detailMatch;
  return `https://www.formula1.com/en/results/${year}/races/${trimmedMeetingKey}/${slug}`;
}

function extractResultsTable(rawContent) {
  if (/No results available/i.test(rawContent)) {
    return '';
  }

  const tableMatch =
    rawContent.match(/<table[^>]*class="[^"]*Table-module_table[^"]*"[^>]*>[\s\S]*?<\/table>/i) ??
    rawContent.match(/<table[^>]*>[\s\S]*?<\/table>/i);

  return tableMatch?.[0] ?? '';
}

function extractTableRows(tableHtml) {
  const tbodyHtml = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? tableHtml;
  return [...tbodyHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[0]);
}

function extractTableCells(rowHtml) {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
}

function resolveDriverIdFromCell(cellHtml) {
  const normalizedCellText = normalizeText(cellHtml);
  const abbreviationMatch = normalizedCellText.match(/\b([A-Z]{3})\b$/);
  if (abbreviationMatch?.[1]) {
    return abbreviationMatch[1].toLowerCase();
  }

  const normalizedDriverName = canonicalizeDriverName(
    normalizedCellText.replace(/\b[A-Z]{3}\b$/i, '').trim(),
  );

  return appConfig.driverIdOverrides[normalizedDriverName] ?? '';
}

function parseOrderedDriversFromResultsTable(rawContent, maxPosition) {
  const tableHtml = extractResultsTable(rawContent);
  if (!tableHtml) {
    return [];
  }

  const orderedDrivers = Array.from({ length: maxPosition }, () => '');

  extractTableRows(tableHtml).forEach((rowHtml) => {
    const cells = extractTableCells(rowHtml);
    if (cells.length < 3) {
      return;
    }

    const position = Number.parseInt(normalizeText(cells[0]), 10);
    if (!Number.isInteger(position) || position < 1 || position > maxPosition) {
      return;
    }

    const driverId = resolveDriverIdFromCell(cells[2]);
    if (!driverId) {
      return;
    }

    orderedDrivers[position - 1] = driverId;
  });

  return orderedDrivers;
}

function parseRaceClassification(rawContent) {
  const [first = '', second = '', third = ''] = parseOrderedDriversFromResultsTable(rawContent, 3);
  return { first, second, third };
}

function parseBonusDriver(rawContent) {
  return parseOrderedDriversFromResultsTable(rawContent, 1)[0] ?? '';
}

function getRaceStartTime(race) {
  const startTimeStr = race?.raceStartTime || (race?.endDate ? `${race.endDate}T14:00:00Z` : null);
  if (!startTimeStr) {
    return null;
  }

  const normalizedTime = String(startTimeStr).replace(' ', 'T');
  const startTime = new Date(normalizedTime);
  return Number.isNaN(startTime.getTime()) ? null : startTime;
}

function hasOfficialRaceClassification(results = {}) {
  return ['first', 'second', 'third'].every((field) => normalizeText(results?.[field]).length > 0);
}

function resolveRacePhase(race, results, now = new Date()) {
  if (hasOfficialRaceClassification(results)) {
    return 'finished';
  }

  const startTime = getRaceStartTime(race);
  if (!startTime) {
    return 'open';
  }

  return now >= startTime ? 'live' : 'open';
}

function normalizeDateRangeLabel(value) {
  return normalizeText(value)
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\b([A-Za-z]{3})\b/g, (match) => match.toUpperCase());
}

function extractTextFragments(value = '') {
  return [...String(value).matchAll(/>([^<>]+)</g)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);
}

function buildIsoDate(year, monthLabel, dayLabel) {
  const monthIndex = MONTH_INDEX[String(monthLabel).slice(0, 3).toUpperCase()];
  /* v8 ignore next 3 */
  if (monthIndex === undefined) {
    return '';
  }

  const parsedDay = Number(dayLabel);
  /* v8 ignore next 3 */
  if (!Number.isInteger(parsedDay)) {
    return '';
  }

  return new Date(Date.UTC(year, monthIndex, parsedDay)).toISOString().slice(0, 10);
}

function parseDateRangeLabel(dateRangeLabel, year) {
  const normalizedLabel = normalizeDateRangeLabel(dateRangeLabel);

  const sameMonthMatch = normalizedLabel.match(/^(\d{2}) - (\d{2}) ([A-Z]{3})$/);
  if (sameMonthMatch) {
    const [, startDay, endDay, monthLabel] = sameMonthMatch;
    return {
      startDate: buildIsoDate(year, monthLabel, startDay),
      endDate: buildIsoDate(year, monthLabel, endDay),
    };
  }

  const splitMonthMatch = normalizedLabel.match(/^(\d{2}) ([A-Z]{3}) - (\d{2}) ([A-Z]{3})$/);
  if (splitMonthMatch) {
    const [, startDay, startMonth, endDay, endMonth] = splitMonthMatch;
    return {
      startDate: buildIsoDate(year, startMonth, startDay),
      endDate: buildIsoDate(year, endMonth, endDay),
    };
  }

  const singleDayMatch = normalizedLabel.match(/^(\d{2}) ([A-Z]{3})$/);
  if (singleDayMatch) {
    const [, day, monthLabel] = singleDayMatch;
    const date = buildIsoDate(year, monthLabel, day);
    return {
      startDate: date,
      endDate: date,
    };
  }

  return {
    startDate: '',
    endDate: '',
  };
}

function parseSeasonCalendarPage(rawContent, year = currentYear) {
  const anchorPattern = new RegExp(
    `<a[^>]+href="(/en/racing/${year}/[^"#?]+)"[\\s\\S]*?<\\/a>`,
    'gi',
  );
  const seasonRaceMap = new Map();

  for (const match of rawContent.matchAll(anchorPattern)) {
    const [anchorHtml, href] = match;
    const slug = href.split('/').at(-1);
    if (!slug || slug.startsWith('pre-season-testing')) {
      continue;
    }

    const fragments = extractTextFragments(anchorHtml);
    const roundFragment = fragments.find((fragment) => /^ROUND\s*\d+$/i.test(fragment));
    const roundMatch = roundFragment?.match(/ROUND\s*(\d+)/i);
    /* v8 ignore next 3 */
    if (!roundMatch) {
      continue;
    }

    const roundNumber = Number(roundMatch[1]);
    const dateFragment = fragments.find((fragment) =>
      /^(\d{2}\s*(?:[A-Za-z]{3}\s*)?-\s*\d{2}\s*[A-Za-z]{3})$/i.test(
        normalizeDateRangeLabel(fragment),
      ),
    );
    const dateRangeLabel = normalizeDateRangeLabel(dateFragment ?? '');
    const meetingName =
      fragments.find((fragment) => {
        const normalizedFragment = normalizeDateRangeLabel(fragment);
        return (
          !/^ROUND\s*\d+$/i.test(fragment) &&
          !/^NEXT RACE$/i.test(fragment) &&
          !/^UPCOMING$/i.test(fragment) &&
          !/^FLAG OF /i.test(fragment) &&
          !/^(\d{2}\s*(?:[A-Za-z]{3}\s*)?-\s*\d{2}\s*[A-Za-z]{3})$/i.test(
            normalizedFragment,
          ) &&
          !fragment.includes('FORMULA 1')
        );
      }) ?? '';
    const grandPrixTitle =
      fragments.find((fragment) => fragment.includes('FORMULA 1')) ??
      `${meetingName} Grand Prix ${year}`;
    const heroImageMatches = [...anchorHtml.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(
      (imageMatch) => imageMatch[1],
    );
    const heroImageUrl =
      heroImageMatches.find((imageUrl) => imageUrl.includes('/races/card/')) ??
      heroImageMatches[0] ??
      '';
    const { startDate, endDate } = parseDateRangeLabel(dateRangeLabel, year);

    seasonRaceMap.set(slug, {
      meetingKey: slug,
      meetingName,
      grandPrixTitle,
      roundNumber,
      dateRangeLabel,
      detailUrl: `https://www.formula1.com${href}`,
      heroImageUrl,
      trackOutlineUrl: '',
      isSprintWeekend: false,
      startDate,
      endDate,
    });
  }

  return sortCalendarByRound([...seasonRaceMap.values()]);
}

function parseRaceDetailPage(rawContent, fallbackMeetingName = '', fallbackSlug = '', fallbackDate = '') {
  const titleMatch = rawContent.match(/<title>([^<]+?) - F1 Race<\/title>/i);
  const escapedSlug = String(fallbackSlug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const meetingKeyPattern = new RegExp(
    `/results/\\d{4}/races/(\\d+)/${escapedSlug}(?:/|")`,
    'i',
  );
  const sprintPattern = new RegExp(
    `/${escapedSlug}/(?:sprint-results|sprint-qualifying|sprint-shootout)`,
    'i',
  );
  const meetingKeyMatch = rawContent.match(meetingKeyPattern);
  const heroMatch = rawContent.match(/<meta property="og:image" content="([^"]+)"/i);
  const trackMatch = rawContent.match(
    /https:\/\/media\.formula1\.com\/[^"]*\/common\/f1\/\d{4}\/track\/[^"]+\.(?:webp|svg)/i,
  );
  const isSprintWeekend = sprintPattern.test(rawContent);

  const normalizedTitle = normalizeText(titleMatch?.[1] ?? '');

  // Find all sessions using JSON-LD or similar script patterns
  const sessions = [];
  const cleanContent = rawContent.replace(/\s+/g, ' ');
  
  const typePattern = /"@type"\s*:\s*"SportsEvent"/gi;
  let typeMatch;
  
  while ((typeMatch = typePattern.exec(cleanContent)) !== null) {
    // Look ahead from the current @type match to find name and startDate
    // Limit search area to 1500 chars to avoid jumping to the next event
    const searchArea = cleanContent.substring(typeMatch.index, typeMatch.index + 1500);
    const nameMatch = searchArea.match(/"name"\s*:\s*"([^"]+)"/i);
    const dateMatch = searchArea.match(/"startDate"\s*:\s*"([^"]+)"/i);
    
    if (nameMatch && dateMatch) {
      const rawName = nameMatch[1];
      const startTime = dateMatch[1];
      const cleanName = rawName.split(' - ')[0].trim();
      
      const validSessions = ['Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Sprint Shootout', 'Sprint Qualifying', 'Sprint', 'Race'];
      if (validSessions.some(vs => cleanName.startsWith(vs)) && !sessions.some(s => s.name === cleanName)) {
        sessions.push({ name: cleanName, startTime });
      }
    }
  }

  // Sort sessions by time
  sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  let raceStartTime = sessions.find(s => s.name.toLowerCase().includes('race'))?.startTime;

  // Generic startDate fallback for raceStartTime if no session found (broad match)
  if (!raceStartTime) {
    const genericTimeMatch = rawContent.match(/"startDate"\s*:\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^"]*)"/i);
    raceStartTime = genericTimeMatch?.[1] || '';
  }

  // Fallback: Use the end date at 14:00 UTC if we couldn't find a specific time
  if (!raceStartTime && fallbackDate) {
    raceStartTime = `${fallbackDate}T14:00:00Z`;
  }

  return {
    meetingKey: meetingKeyMatch?.[1] ?? fallbackSlug,
    grandPrixTitle: normalizedTitle || `${fallbackMeetingName} Grand Prix ${currentYear}`,
    heroImageUrl: heroMatch?.[1] ?? '',
    trackOutlineUrl: trackMatch?.[0] ?? '',
    isSprintWeekend,
    raceStartTime,
    sessions: sessions.length > 0 ? sessions : undefined,
  };
}

function sortCalendarByRound(calendar) {
  return [...calendar].sort((firstWeekend, secondWeekend) => {
    return firstWeekend.roundNumber - secondWeekend.roundNumber;
  });
}

async function fetchHtml(url, headers = {}) {
  const response = await fetch(url, { headers });

  if (!response || typeof response.ok !== 'boolean' || typeof response.text !== 'function') {
    throw new Error(`Invalid response received from ${url}`);
  }

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return response.text();
}

async function syncCalendarFromOfficialSource({
  fetchHtmlImpl = fetchHtml,
  readCache = readCalendarCache,
  writeCache = writeCalendarCache,
} = {}) {
  const backendText = appConfig.uiText.backend;

  console.log(backendText.logs.calendarSyncStart);

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      if (attempt > 0) {
        console.log(`[Backend] Retry attempt ${attempt}/${maxAttempts - 1} per scaricare il calendario in corso...`);
      }

      const seasonHtml = await fetchHtmlImpl(appConfig.calendarSource.seasonUrl, getBrowserHeaders());
      const baseCalendar = parseSeasonCalendarPage(seasonHtml, currentYear);

      /* v8 ignore next 3 */
      if (baseCalendar.length < appConfig.calendarSource.expectedMinimumWeekends) {
        throw new Error(backendText.errors.invalidCalendarSource);
      }

      const enrichedCalendar = await Promise.all(
        baseCalendar.map(async (weekend) => {
          try {
            const detailHtml = await fetchHtmlImpl(weekend.detailUrl, getBrowserHeaders());
            const detailData = parseRaceDetailPage(
              detailHtml,
              weekend.meetingName,
              weekend.meetingKey,
              weekend.endDate,
            );

            return {
              ...weekend,
              meetingKey: detailData.meetingKey,
              grandPrixTitle: detailData.grandPrixTitle,
              heroImageUrl: detailData.heroImageUrl || weekend.heroImageUrl,
              trackOutlineUrl: detailData.trackOutlineUrl || weekend.trackOutlineUrl,
              isSprintWeekend: detailData.isSprintWeekend,
              raceStartTime: detailData.raceStartTime,
              sessions: detailData.sessions,
              ...(shouldLookupFinishedRaceHighlights({ ...weekend, ...detailData })
                ? await resolveSkySportHighlightsVideo(
                    {
                      ...weekend,
                      ...detailData,
                    },
                    {
                      fetchHtmlImpl,
                      now: new Date(),
                    },
                  )
                : {
                    highlightsVideoUrl: weekend.highlightsVideoUrl ?? '',
                    highlightsLookupCheckedAt: weekend.highlightsLookupCheckedAt ?? '',
                    highlightsLookupStatus: weekend.highlightsLookupStatus ?? '',
                    highlightsLookupSource: weekend.highlightsLookupSource ?? '',
                  }),
            };
          } catch {
            return {
              ...weekend,
            };
          }
        }),
      );

      const normalizedCalendar = sortCalendarByRound(enrichedCalendar);

      await writeCache(normalizedCalendar);
      console.log(
        formatConfigText(backendText.logs.calendarSyncSuccess, {
          count: normalizedCalendar.length,
        }),
      );

      return normalizedCalendar;
    } catch {
      attempt++;
      if (attempt < maxAttempts) {
        // Wait 2 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error(`[Avviso Backend] Fallito il caricamento del calendario dopo ${maxAttempts} tentativi.`);
      }
    }
  }

  // Fallback se tutti i tentativi falliscono
  const cachedCalendar = sortCalendarByRound(await readCache());

  if (cachedCalendar.length > 0) {
    console.warn(
      formatConfigText(backendText.logs.calendarSyncFallback, {
        count: cachedCalendar.length,
      }),
    );
    return cachedCalendar;
  }

  console.error(backendText.logs.calendarSyncNoCache);
  return [];
}

async function fetchRaceResults(meetingKey) {
  const calendar = await readCalendarCache();
  const race = calendar.find((entry) => entry.meetingKey === meetingKey);

  return fetchRaceResultsForRace(race, meetingKey);
}

async function fetchRaceResultsForRace(race, meetingKey) {
  const cachedResults = getCachedRaceResults(meetingKey);
  if (cachedResults) {
    return cachedResults;
  }

  /* v8 ignore next 3 */
  if (!race || !race.detailUrl) {
    throw new Error('Race not found in calendar');
  }

  const resultsBaseUrl = buildOfficialResultsBaseUrl(race.detailUrl, race.meetingKey);

  /* v8 ignore next 3 */
  if (!resultsBaseUrl) {
    throw new Error('Race results URL could not be derived from calendar data');
  }

  const resultsUrl = `${resultsBaseUrl}/race-result`;
  const poleUrl = race.isSprintWeekend
    ? `${resultsBaseUrl}/sprint-results`
    : `${resultsBaseUrl}/qualifying`;

  try {
    const [raceHtml, poleHtml] = await Promise.all([
      fetchHtml(resultsUrl, getBrowserHeaders()).catch(() => ''),
      fetchHtml(poleUrl, getBrowserHeaders()).catch(() => ''),
    ]);

    const results = {
      first: '',
      second: '',
      third: '',
      pole: '',
    };

    if (raceHtml) {
      Object.assign(results, parseRaceClassification(raceHtml));
    }

    if (poleHtml) {
      results.pole = parseBonusDriver(poleHtml);
    }

    return setCachedRaceResults(meetingKey, results);
  /* v8 ignore next 4 */
  } catch (error) {
    console.error('Error fetching race results:', error);
    throw error;
  }
}

async function fetchRaceResultsWithStatus(meetingKey, now = new Date()) {
  let calendar = await readCalendarCache();
  const race = calendar.find((entry) => entry.meetingKey === meetingKey);
  const results = await fetchRaceResultsForRace(race, meetingKey);
  const racePhase = resolveRacePhase(race, results, now);
  let highlightsVideoUrl = normalizeText(race?.highlightsVideoUrl);

  if (racePhase === 'finished' && shouldLookupFinishedRaceHighlights(race, now.getTime())) {
    const lookupResult = await resolveSkySportHighlightsVideo(race, { now });
    highlightsVideoUrl = lookupResult.highlightsVideoUrl;
    calendar = await persistRaceHighlightsLookup(calendar, meetingKey, lookupResult);
  }

  return {
    ...results,
    racePhase,
    highlightsVideoUrl,
  };
}

export {
  buildHighlightsSearchQuery,
  buildOfficialResultsBaseUrl,
  clearRaceResultsCache,
  extractHighlightsVideoUrlFromSearchHtml,
  fetchRaceResults,
  fetchRaceResultsWithStatus,
  fetchHighlightsVideoUrl,
  hasOfficialRaceClassification,
  normalizeYoutubeWatchUrl,
  parseDateRangeLabel,
  parseRaceDetailPage,
  parseSeasonCalendarPage,
  persistRaceHighlightsLookup,
  persistRaceHighlightsVideoUrl,
  resolveSkySportHighlightsVideo,
  resolveRacePhase,
  shouldLookupFinishedRaceHighlights,
  sortCalendarByRound,
  syncCalendarFromOfficialSource,
};
