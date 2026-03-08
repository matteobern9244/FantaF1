import { getBrowserHeaders } from './config.js';

class RaceResultsCache {
  constructor({ ttlMs = 30_000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
  }

  clear() {
    this.cache.clear();
  }

  get(meetingKey) {
    const cachedEntry = this.cache.get(meetingKey);
    if (!cachedEntry) {
      return null;
    }

    if (this.now() - cachedEntry.timestamp > this.ttlMs) {
      this.cache.delete(meetingKey);
      return null;
    }

    return { ...cachedEntry.results };
  }

  set(meetingKey, results) {
    const clonedResults = { ...results };
    this.cache.set(meetingKey, {
      timestamp: this.now(),
      results: clonedResults,
    });

    return { ...clonedResults };
  }
}

class RaceResultsService {
  constructor({
    readCalendarCache,
    fetchHtmlImpl,
    cache = new RaceResultsCache(),
    buildOfficialResultsBaseUrl,
    parseRaceClassification,
    parseBonusDriver,
    resolveRacePhase,
    shouldLookupFinishedRaceHighlights = () => false,
    resolveSkySportHighlightsVideo = async () => ({ highlightsVideoUrl: '' }),
    persistRaceHighlightsLookup = async (calendar) => calendar,
  }) {
    this.readCalendarCache = readCalendarCache;
    this.fetchHtmlImpl = fetchHtmlImpl;
    this.cache = cache;
    this.buildOfficialResultsBaseUrl = buildOfficialResultsBaseUrl;
    this.parseRaceClassification = parseRaceClassification;
    this.parseBonusDriver = parseBonusDriver;
    this.resolveRacePhase = resolveRacePhase;
    this.shouldLookupFinishedRaceHighlights = shouldLookupFinishedRaceHighlights;
    this.resolveSkySportHighlightsVideo = resolveSkySportHighlightsVideo;
    this.persistRaceHighlightsLookup = persistRaceHighlightsLookup;
  }

  clearCache() {
    this.cache.clear();
  }

  async fetchRaceResults(meetingKey) {
    const calendar = await this.readCalendarCache();
    const race = calendar.find((entry) => entry.meetingKey === meetingKey);

    return this.fetchRaceResultsForRace(race, meetingKey);
  }

  async fetchRaceResultsForRace(race, meetingKey) {
    const cachedResults = this.cache.get(meetingKey);
    if (cachedResults) {
      return cachedResults;
    }

    if (!race || !race.detailUrl) {
      throw new Error('Race not found in calendar');
    }

    const resultsBaseUrl = this.buildOfficialResultsBaseUrl(race.detailUrl, race.meetingKey);
    if (!resultsBaseUrl) {
      throw new Error('Race results URL could not be derived from calendar data');
    }

    const resultsUrl = `${resultsBaseUrl}/race-result`;
    const poleUrl = race.isSprintWeekend
      ? `${resultsBaseUrl}/sprint-results`
      : `${resultsBaseUrl}/qualifying`;

    const [raceHtml, poleHtml] = await Promise.all([
      this.fetchHtmlImpl(resultsUrl, getBrowserHeaders()).catch(() => ''),
      this.fetchHtmlImpl(poleUrl, getBrowserHeaders()).catch(() => ''),
    ]);

    const results = {
      first: '',
      second: '',
      third: '',
      pole: '',
    };

    if (raceHtml) {
      Object.assign(results, this.parseRaceClassification(raceHtml));
    }

    if (poleHtml) {
      results.pole = this.parseBonusDriver(poleHtml);
    }

    return this.cache.set(meetingKey, results);
  }

  async fetchRaceResultsWithStatus(meetingKey, now = new Date()) {
    let calendar = await this.readCalendarCache();
    const race = calendar.find((entry) => entry.meetingKey === meetingKey);
    const results = await this.fetchRaceResultsForRace(race, meetingKey);
    const racePhase = this.resolveRacePhase(race, results, now);
    let highlightsVideoUrl = String(race?.highlightsVideoUrl ?? '').trim();

    if (racePhase === 'finished' && this.shouldLookupFinishedRaceHighlights(race, now.getTime())) {
      try {
        const lookupResult = await this.resolveSkySportHighlightsVideo(race, { now });
        highlightsVideoUrl = lookupResult.highlightsVideoUrl;
        calendar = await this.persistRaceHighlightsLookup(calendar, meetingKey, lookupResult);
      } catch {
        highlightsVideoUrl = String(race?.highlightsVideoUrl ?? '').trim();
      }
    }

    return {
      ...results,
      racePhase,
      highlightsVideoUrl,
    };
  }
}

export { RaceResultsCache, RaceResultsService };
