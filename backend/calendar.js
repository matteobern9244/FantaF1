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

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&nbsp;', ' ');
}

function normalizeText(value) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDateRangeLabel(value) {
  return normalizeText(value)
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\b([A-Za-z]{3})\b/g, (match) => match.toUpperCase());
}

function extractTextFragments(value) {
  return [...String(value ?? '').matchAll(/>([^<>]+)</g)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);
}

function buildIsoDate(year, monthLabel, dayLabel) {
  const monthIndex = MONTH_INDEX[String(monthLabel).slice(0, 3).toUpperCase()];
  if (monthIndex === undefined) {
    return '';
  }

  const parsedDay = Number(dayLabel);
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
    const slug = href.split('/').at(-1) ?? '';
    if (!slug || slug.startsWith('pre-season-testing')) {
      continue;
    }

    const fragments = extractTextFragments(anchorHtml);
    const roundFragment = fragments.find((fragment) => /^ROUND\s*\d+$/i.test(fragment));
    const roundMatch = roundFragment?.match(/ROUND\s*(\d+)/i);
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

  // Try to find a JSON-LD or script with race timing.
  // F1 site often uses ISO strings for session starts.
  const isoTimeMatch = rawContent.match(/"startDate"\s*:\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^"]*)"/i);
  let raceStartTime = isoTimeMatch?.[1] || '';

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
  };
}

function sortCalendarByRound(calendar) {
  return [...calendar].sort((firstWeekend, secondWeekend) => {
    return firstWeekend.roundNumber - secondWeekend.roundNumber;
  });
}

async function fetchHtml(url, headers = {}) {
  const response = await fetch(url, { headers });

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
              weekend.endDate || weekend.startDate,
            );

            return {
              ...weekend,
              meetingKey: detailData.meetingKey || weekend.meetingKey,
              grandPrixTitle: detailData.grandPrixTitle || weekend.grandPrixTitle,
              heroImageUrl: detailData.heroImageUrl || weekend.heroImageUrl,
              trackOutlineUrl: detailData.trackOutlineUrl || weekend.trackOutlineUrl,
              isSprintWeekend: detailData.isSprintWeekend,
              raceStartTime: detailData.raceStartTime,
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
  // official results URL pattern: https://www.formula1.com/en/results/2026/races/<meetingKey>/<slug>/race-result
  // meetingKey might be the numeric ID or the slug depending on how it's stored.
  // We'll search for the weekend in cache to get the detailUrl.
  const calendar = await readCalendarCache();
  const race = calendar.find(r => r.meetingKey === meetingKey);
  
  if (!race || !race.detailUrl) {
    throw new Error('Race not found in calendar');
  }

  const resultsUrl = race.detailUrl.replace(/\/racing\/\d{4}\//, (match) => match.replace('racing', 'results')) + '/race-result';
  const poleUrl = race.isSprintWeekend 
    ? race.detailUrl.replace(/\/racing\/\d{4}\//, (match) => match.replace('racing', 'results')) + '/sprint-results'
    : race.detailUrl.replace(/\/racing\/\d{4}\//, (match) => match.replace('racing', 'results')) + '/qualifying';

  try {
    const [raceHtml, poleHtml] = await Promise.all([
      fetchHtml(resultsUrl, getBrowserHeaders()).catch(() => ''),
      fetchHtml(poleUrl, getBrowserHeaders()).catch(() => '')
    ]);

    const results = {
      first: '',
      second: '',
      third: '',
      pole: ''
    };

    if (raceHtml) {
      // Find drivers in result table. F1 site uses data-driver-id or short codes in cells.
      const driverMatches = [...raceHtml.matchAll(/data-driver-id="([^"]+)"/gi)].map(m => m[1].toLowerCase());
      if (driverMatches.length >= 3) {
        results.first = driverMatches[0];
        results.second = driverMatches[1];
        results.third = driverMatches[2];
      }
    }

    if (poleHtml) {
      const poleMatch = poleHtml.match(/data-driver-id="([^"]+)"/i);
      if (poleMatch) {
        results.pole = poleMatch[1].toLowerCase();
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching race results:', error);
    throw error;
  }
}

export {
  fetchRaceResults,
  parseDateRangeLabel,
  parseRaceDetailPage,
  parseSeasonCalendarPage,
  sortCalendarByRound,
  syncCalendarFromOfficialSource,
};
