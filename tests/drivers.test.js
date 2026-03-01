import fs from 'fs';
import { describe, expect, it } from 'vitest';
import {
  buildDriverRecord,
  canonicalizeDriverName,
  normalizeDrivers,
  parseFormulaOneDriversPage,
  parseStatsSeasonDriversHtml,
} from '../backend/drivers.js';

const statsFixture = fs.readFileSync(
  new URL('./fixtures/statsf1-season.html', import.meta.url),
  'utf8',
);

describe('driver parsing and normalization', () => {
  it('parses the StatsF1 roster fixture and normalizes aliases', () => {
    const parsedDrivers = parseStatsSeasonDriversHtml(statsFixture);

    expect(parsedDrivers).toEqual([
      { name: 'Alexander Albon', team: 'Williams' },
      { name: 'Oliver Bearman', team: 'Haas' },
      { name: 'Max Verstappen', team: 'Red Bull' },
    ]);
    expect(canonicalizeDriverName('Alex Albon')).toBe('Alexander Albon');
    expect(canonicalizeDriverName('Ollie Bearman')).toBe('Oliver Bearman');
  });

  it('preserves stable ids and enriches roster entries with Formula1 media', () => {
    const formulaOneFixture = `
      <a href="/en/drivers/alexander-albon">
        <img src="https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/williams/alealb01/2026williamsalealb01right.webp" />
        <span class="typography-module_body-m-compact-regular__abc">Alexander</span>
        <span class="typography-module_body-m-compact-bold__def uppercase">Albon</span>
      </a>
      <a href="/en/drivers/oliver-bearman">
        <img src="https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/haas/olibea01/2026haasolibea01right.webp" />
        <span class="typography-module_body-m-compact-regular__abc">Oliver</span>
        <span class="typography-module_body-m-compact-bold__def uppercase">Bearman</span>
      </a>
    `;
    const formulaData = parseFormulaOneDriversPage(formulaOneFixture);
    const normalized = normalizeDrivers(statsFixture, formulaData);
    const alex = normalized.find((driver) => driver.id === 'alb');
    const oliver = normalized.find((driver) => driver.id === 'bea');

    expect(alex?.avatarUrl).toContain('2026williamsalealb01right.webp');
    expect(alex?.teamSlug).toBe('williams');
    expect(oliver?.team).toBe('Haas');

    const directRecord = buildDriverRecord('Alex Albon', 'Williams', new Set());
    expect(directRecord.id).toBe('alb');
    expect(directRecord.name).toBe('Alexander Albon');
  });
});
