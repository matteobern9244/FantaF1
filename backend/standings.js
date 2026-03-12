import { appConfig, getBrowserHeaders } from './config.js';
import { readDriversCache, readStandingsCache, writeStandingsCache } from './storage.js';

function decodeHtmlEntities(value = '') {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ');
}

function stripTags(value = '') {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeText(value = '') {
  return stripTags(value).replace(/\s+/g, ' ').trim();
}

function normalizeDriverName(name = '') {
  return normalizeText(name)
    .replace(/\b[A-Z]{3}\b$/, '')
    .trim();
}

function normalizeTeamName(team = '') {
  const normalizedTeam = normalizeText(team);
  return appConfig.teamAliases[normalizedTeam] ?? normalizedTeam;
}

function getTeamLogoUrl(team = '') {
  return appConfig.teamAssets?.[team]?.logoUrl ?? '';
}

function parseStandingsRows(rawContent) {
  const rowPattern = /<tr\b[\s\S]*?<\/tr>/gi;
  const rows = [];

  for (const match of rawContent.matchAll(rowPattern)) {
    const rowHtml = match[0];
    const cells = [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) =>
      normalizeText(cellMatch[1]),
    );

    if (cells.length < 3) {
      continue;
    }

    const position = Number.parseInt(cells[0], 10);
    const points = Number.parseInt(cells[cells.length - 1], 10);

    if (!Number.isFinite(position) || !Number.isFinite(points)) {
      continue;
    }

    rows.push({ position, cells, points });
  }

  return rows;
}

function parseDriverStandings(rawContent, drivers = []) {
  const driversByName = new Map(
    drivers.map((driver) => [normalizeDriverName(driver.name), driver]),
  );

  return parseStandingsRows(rawContent).map((row) => {
    const rawName = row.cells[1];
    const rawTeam = row.cells[2];
    const name = normalizeDriverName(rawName);
    const driver = driversByName.get(name);
    const team = normalizeTeamName(driver?.team ?? rawTeam);

    return {
      position: row.position,
      driverId: driver?.id ?? '',
      name,
      team,
      points: row.points,
      avatarUrl: driver?.avatarUrl ?? '',
      color: driver?.color ?? appConfig.teamColors[team] ?? appConfig.teamColors.default,
    };
  });
}

function parseConstructorStandings(rawContent) {
  return parseStandingsRows(rawContent).map((row) => {
    const team = normalizeTeamName(row.cells[1]);

    return {
      position: row.position,
      team,
      points: row.points,
      color: appConfig.teamColors[team] ?? appConfig.teamColors.default,
      logoUrl: getTeamLogoUrl(team),
    };
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

class StandingsService {
  constructor({
    fetchHtmlImpl = fetchHtml,
    readDriversCacheImpl = readDriversCache,
    readStandingsCacheImpl = readStandingsCache,
    writeStandingsCacheImpl = writeStandingsCache,
    now = () => new Date(),
  } = {}) {
    this.fetchHtmlImpl = fetchHtmlImpl;
    this.readDriversCacheImpl = readDriversCacheImpl;
    this.readStandingsCacheImpl = readStandingsCacheImpl;
    this.writeStandingsCacheImpl = writeStandingsCacheImpl;
    this.now = now;
  }

  async syncStandingsFromOfficialSource() {
    const drivers = await this.readDriversCacheImpl();

    try {
      const [driversHtml, constructorsHtml] = await Promise.all([
        this.fetchHtmlImpl(appConfig.standingsSource.driversUrl, getBrowserHeaders()),
        this.fetchHtmlImpl(appConfig.standingsSource.constructorsUrl, getBrowserHeaders()),
      ]);

      const standings = {
        driverStandings: parseDriverStandings(driversHtml, drivers),
        constructorStandings: parseConstructorStandings(constructorsHtml),
        updatedAt: this.now().toISOString(),
      };

      if (standings.driverStandings.length === 0 || standings.constructorStandings.length === 0) {
        throw new Error('Invalid standings source');
      }

      await this.writeStandingsCacheImpl(standings);
      return standings;
    } catch {
      return this.readStandingsCacheImpl();
    }
  }
}

const standingsService = new StandingsService();

async function syncStandingsFromOfficialSource() {
  return standingsService.syncStandingsFromOfficialSource();
}

export {
  StandingsService,
  getTeamLogoUrl,
  normalizeDriverName,
  normalizeTeamName,
  parseConstructorStandings,
  parseDriverStandings,
  parseStandingsRows,
  syncStandingsFromOfficialSource,
};
