import { appConfig, currentYear, formatConfigText, getBrowserHeaders } from './config.js';
import {
  buildHighlightsSearchQuery,
  extractHighlightsVideoUrlFromSearchHtml,
  fetchHighlightsVideoUrl,
  normalizeYoutubeWatchUrl,
  resolveSkySportHighlightsVideo,
  shouldLookupFinishedRaceHighlights,
} from './highlights.js';
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

function isMeetingNameFragment(fragment = '') {
  const normalizedFragment = normalizeDateRangeLabel(fragment);

  /* v8 ignore next 3 -- extractTextFragments() already drops empty fragments */
  if (!fragment) {
    return false;
  }

  if (/^ROUND\s*\d+$/i.test(fragment)) {
    return false;
  }

  if (/^(NEXT RACE|UPCOMING|CHEQUERED FLAG)$/i.test(fragment)) {
    return false;
  }

  if (/^FLAG OF /i.test(fragment)) {
    return false;
  }

  if (/^(\d{2}\s*(?:[A-Za-z]{3}\s*)?-\s*\d{2}\s*[A-Za-z]{3})$/i.test(normalizedFragment)) {
    return false;
  }

  if (/^\d+(?:ST|ND|RD|TH)?$/i.test(fragment) || /^[A-Z]{3}$/.test(fragment)) {
    return false;
  }

  return !fragment.includes('FORMULA 1');
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
    const meetingName = fragments.find((fragment) => isMeetingNameFragment(fragment)) ?? '';
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

function buildWeekendWithDetailData(weekend, detailData) {
  return {
    ...weekend,
    meetingKey: detailData.meetingKey,
    grandPrixTitle: detailData.grandPrixTitle,
    heroImageUrl: detailData.heroImageUrl || weekend.heroImageUrl,
    trackOutlineUrl: detailData.trackOutlineUrl || weekend.trackOutlineUrl,
    isSprintWeekend: detailData.isSprintWeekend,
    raceStartTime: detailData.raceStartTime,
    sessions: detailData.sessions,
  };
}

function buildWeekendWithHighlightsFallback(weekend) {
  return {
    ...weekend,
    highlightsVideoUrl: weekend.highlightsVideoUrl ?? '',
    highlightsLookupCheckedAt: weekend.highlightsLookupCheckedAt ?? '',
    highlightsLookupStatus: weekend.highlightsLookupStatus ?? '',
    highlightsLookupSource: weekend.highlightsLookupSource ?? '',
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
            const weekendWithDetailData = buildWeekendWithDetailData(weekend, detailData);

            if (!shouldLookupFinishedRaceHighlights(weekendWithDetailData)) {
              return buildWeekendWithHighlightsFallback(weekendWithDetailData);
            }

            try {
              const highlightsLookup = await resolveSkySportHighlightsVideo(
                weekendWithDetailData,
                {
                  fetchHtmlImpl,
                  now: new Date(),
                },
              );

              return {
                ...weekendWithDetailData,
                ...highlightsLookup,
              };
            } catch {
              return buildWeekendWithHighlightsFallback(weekendWithDetailData);
            }
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
    try {
      const lookupResult = await resolveSkySportHighlightsVideo(race, { now });
      highlightsVideoUrl = lookupResult.highlightsVideoUrl;
      calendar = await persistRaceHighlightsLookup(calendar, meetingKey, lookupResult);
    } catch {
      highlightsVideoUrl = normalizeText(race?.highlightsVideoUrl);
    }
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
