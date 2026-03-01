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

function parseRaceDetailPage(rawContent, fallbackMeetingName = '', fallbackSlug = '') {
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

  return {
    meetingKey: meetingKeyMatch?.[1] ?? fallbackSlug,
    grandPrixTitle: normalizedTitle || `${fallbackMeetingName} Grand Prix ${currentYear}`,
    heroImageUrl: heroMatch?.[1] ?? '',
    trackOutlineUrl: trackMatch?.[0] ?? '',
    isSprintWeekend,
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

  try {
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
          );

          return {
            ...weekend,
            meetingKey: detailData.meetingKey || weekend.meetingKey,
            grandPrixTitle: detailData.grandPrixTitle || weekend.grandPrixTitle,
            heroImageUrl: detailData.heroImageUrl || weekend.heroImageUrl,
            trackOutlineUrl: detailData.trackOutlineUrl || weekend.trackOutlineUrl,
            isSprintWeekend: detailData.isSprintWeekend,
          };
        } catch {
          return {
            ...weekend,
          };
        }
      }),
    );

    const normalizedCalendar = sortCalendarByRound(enrichedCalendar);

    writeCache(normalizedCalendar);
    console.log(
      formatConfigText(backendText.logs.calendarSyncSuccess, {
        count: normalizedCalendar.length,
      }),
    );

    return normalizedCalendar;
  } catch (error) {
    const cachedCalendar = sortCalendarByRound(readCache());

    if (cachedCalendar.length > 0) {
      console.warn(
        formatConfigText(backendText.logs.calendarSyncFallback, {
          count: cachedCalendar.length,
        }),
      );
      return cachedCalendar;
    }

    console.error(backendText.logs.calendarSyncNoCache, error);
    return [];
  }
}

export {
  parseDateRangeLabel,
  parseRaceDetailPage,
  parseSeasonCalendarPage,
  sortCalendarByRound,
  syncCalendarFromOfficialSource,
};
