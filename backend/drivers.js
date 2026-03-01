import { appConfig, formatConfigText, getBrowserHeaders } from './config.js';
import { readDriversCache, writeDriversCache } from './storage.js';

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&egrave;', 'e')
    .replaceAll('&agrave;', 'a');
}

function stripTags(value) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '));
}

function normalizeText(value) {
  return stripTags(value).replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
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

function canonicalizeTeamName(team) {
  const normalizedTeam = normalizeText(team);
  return appConfig.teamAliases[normalizedTeam] ?? normalizedTeam;
}

function generateFallbackId(name, existingIds) {
  const normalizedName = slugify(name);
  const nameParts = normalizedName.split(/\s+/).filter(Boolean);
  const baseToken = (nameParts.at(-1) ?? normalizedName).slice(0, 3).padEnd(3, 'x');
  let candidateId = baseToken;
  let collisionIndex = 1;

  while (existingIds.has(candidateId)) {
    candidateId = `${baseToken.slice(0, 2)}${collisionIndex}`;
    collisionIndex += 1;
  }

  return candidateId;
}

function sortDriversAlphabetically(drivers) {
  return [...drivers].sort((firstDriver, secondDriver) =>
    firstDriver.name.localeCompare(secondDriver.name, appConfig.driversSource.sortLocale, {
      sensitivity: 'base',
    }),
  );
}

function buildDriverRecord(name, team, existingIds = new Set(), extra = {}) {
  const normalizedName = canonicalizeDriverName(name);
  const normalizedTeam = canonicalizeTeamName(team);
  const overrideId = appConfig.driverIdOverrides[normalizedName];
  const id = overrideId ?? generateFallbackId(normalizedName, existingIds);

  existingIds.add(id);

  return {
    id,
    name: normalizedName,
    team: normalizedTeam,
    color: appConfig.teamColors[normalizedTeam] ?? appConfig.teamColors.default,
    avatarUrl: typeof extra.avatarUrl === 'string' ? extra.avatarUrl : undefined,
    teamSlug: typeof extra.teamSlug === 'string' ? extra.teamSlug : undefined,
  };
}

function findKnownTeam(cells) {
  return cells.find((cell) => {
    const candidate = canonicalizeTeamName(cell);
    return Boolean(appConfig.teamColors[candidate]);
  });
}

function parseStatsSeasonDriversHtml(rawContent) {
  const tableMatch = rawContent.match(
    /<table[^>]+id="ctl00_CPH_Main_GV_Entry"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i,
  );
  const tableContent = tableMatch?.[1] ?? rawContent;
  const rowPattern = /<tr\b[\s\S]*?<\/tr>/gi;
  const parsedDrivers = [];

  for (const rowMatch of tableContent.matchAll(rowPattern)) {
    const rowHtml = rowMatch[0];
    const nameMatch = rowHtml.match(/class="Cur(?:Chp)?Driver"[^>]*>([\s\S]*?)<\/span>/i);
    const cellValues = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((match) => normalizeText(match[1]))
      .filter(Boolean);
    const teamName = findKnownTeam(cellValues);

    if (!nameMatch || !teamName) {
      continue;
    }

    parsedDrivers.push({
      name: canonicalizeDriverName(nameMatch[1]),
      team: canonicalizeTeamName(teamName),
    });
  }

  return parsedDrivers;
}

function parseFormulaOneDriversPage(rawContent) {
  const driverMap = new Map();
  const cardPattern =
    /href="\/en\/drivers\/([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<span class="typography-module_body-m-compact-regular__[^"]*">([^<]+)<\/span>\s*<span class="typography-module_body-m-compact-bold__[^"]*">([^<]+)<\/span>/gi;

  for (const match of rawContent.matchAll(cardPattern)) {
    const [, , avatarUrl, firstName, lastName] = match;
    const normalizedName = canonicalizeDriverName(`${firstName} ${lastName}`);
    const imageMatch = avatarUrl.match(/\/common\/f1\/\d{4}\/([^/]+)\//i);
    const parsedTeamSlug = imageMatch?.[1]?.toLowerCase() ?? '';

    driverMap.set(normalizedName, {
      teamSlug: parsedTeamSlug,
      avatarUrl,
    });
  }

  return driverMap;
}

function buildFormulaOneFallbackDrivers(rawContent) {
  const formulaDrivers = parseFormulaOneDriversPage(rawContent);
  const existingIds = new Set();

  return sortDriversAlphabetically(
    [...formulaDrivers.entries()]
      .map(([name, data]) => {
        const teamName = appConfig.teamSlugNames[data.teamSlug] ?? data.teamSlug;
        if (!teamName) {
          return null;
        }

        return buildDriverRecord(name, teamName, existingIds, data);
      })
      .filter(Boolean),
  );
}

function normalizeDrivers(rawContent, formulaOneDriverData = new Map()) {
  const existingIds = new Set();
  const driverMap = new Map();

  for (const parsedDriver of parseStatsSeasonDriversHtml(rawContent)) {
    const formulaData = formulaOneDriverData.get(parsedDriver.name) ?? {};
    const driver = buildDriverRecord(parsedDriver.name, parsedDriver.team, existingIds, formulaData);
    driverMap.set(driver.id, driver);
  }

  return sortDriversAlphabetically([...driverMap.values()]);
}

async function fetchHtml(url, headers = {}) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return response.text();
}

async function syncDriversFromOfficialSource() {
  const backendText = appConfig.uiText.backend;
  let formulaOneDriversHtml = '';
  const formulaOnePromise = fetchHtml(
    appConfig.driversSource.formulaOneDriversUrl,
    getBrowserHeaders(),
  ).catch(() => '');

  console.log(backendText.logs.driverSyncStart);

  try {
    const statsHtml = await fetchHtml(appConfig.driversSource.statsUrl, getBrowserHeaders());
    formulaOneDriversHtml = await formulaOnePromise;
    const formulaOneDriverData = formulaOneDriversHtml
      ? parseFormulaOneDriversPage(formulaOneDriversHtml)
      : new Map();
    const normalizedDrivers = normalizeDrivers(statsHtml, formulaOneDriverData);

    if (normalizedDrivers.length < appConfig.driversSource.expectedCount) {
      throw new Error(backendText.errors.invalidDriverSource);
    }

    await writeDriversCache(normalizedDrivers);
    console.log(
      formatConfigText(backendText.logs.driverSyncSuccess, {
        count: normalizedDrivers.length,
      }),
    );

    return normalizedDrivers;
  } catch (error) {
    const cachedDrivers = sortDriversAlphabetically(await readDriversCache());

    if (cachedDrivers.length > 0) {
      console.warn(
        formatConfigText(backendText.logs.driverSyncFallback, {
          count: cachedDrivers.length,
        }),
      );
      return cachedDrivers;
    }

    if (!formulaOneDriversHtml) {
      formulaOneDriversHtml = await formulaOnePromise;
    }

    if (formulaOneDriversHtml) {
      const fallbackDrivers = buildFormulaOneFallbackDrivers(formulaOneDriversHtml);
      if (fallbackDrivers.length >= appConfig.driversSource.expectedCount) {
        await writeDriversCache(fallbackDrivers);
        console.warn(
          formatConfigText(backendText.logs.driverSyncFallback, {
            count: fallbackDrivers.length,
          }),
        );
        return fallbackDrivers;
      }
    }

    console.error(backendText.logs.driverSyncNoCache, error);
    return [];
  }
}

export {
  buildDriverRecord,
  canonicalizeDriverName,
  normalizeDrivers,
  parseFormulaOneDriversPage,
  parseStatsSeasonDriversHtml,
  sortDriversAlphabetically,
  syncDriversFromOfficialSource,
};
