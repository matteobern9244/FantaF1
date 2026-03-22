import { describe, expect, it } from 'vitest';
import type { ConstructorStanding, DriverStanding } from '../src/types';
import { appText, formatUiText } from '../src/uiText';

describe('uiText formatters', () => {
  it('formats shared templates with positional replacements', () => {
    expect(formatUiText('Pilota {name} con {points} punti', { name: 'Max', points: 25 })).toBe(
      'Pilota Max con 25 punti',
    );
  });

  it('formats live weekend and archive labels', () => {
    expect(appText.panels.weekendLive.liveTotal(18)).toContain('18');
    expect(appText.panels.weekendLive.confirmedMatches(3)).toContain('3');
    expect(appText.panels.historyArchive.shownCount(7)).toContain('7');
    expect(appText.panels.historyArchive.detailButton('Australia')).toContain('Australia');
  });

  it('formats season analysis dynamic labels and narratives', () => {
    expect(appText.panels.seasonAnalysis.leaderGap(4)).toContain('4');
    expect(appText.panels.seasonAnalysis.hitRate(72)).toContain('72');
    expect(appText.panels.seasonAnalysis.consistency(91)).toContain('91');
    expect(appText.panels.seasonAnalysis.swingGap(2)).toContain('2');
    expect(appText.panels.seasonAnalysis.narratives.charge.description('Marco')).toContain('Marco');
    expect(appText.panels.seasonAnalysis.narratives.consistency.description('Luca')).toContain('Luca');
    expect(appText.panels.seasonAnalysis.narratives.sprint.description('Anna')).toContain('Anna');
    expect(appText.panels.seasonAnalysis.narratives.precision.description('Paolo')).toContain('Paolo');
  });

  it('formats public standings labels from typed entries', () => {
    const driverEntry: DriverStanding = {
      position: 2,
      driverId: 'ham',
      name: 'Lewis Hamilton',
      team: 'Ferrari',
      points: 18,
    };
    const constructorEntry: ConstructorStanding = {
      position: 1,
      team: 'Ferrari',
      points: 44,
    };

    expect(appText.panels.publicStandings.pointsLabel(18)).toContain('18');
    expect(appText.panels.publicStandings.driverPositionLabel(driverEntry)).toBe('P2');
    expect(appText.panels.publicStandings.constructorPositionLabel(constructorEntry)).toBe('P1');
  });
});
