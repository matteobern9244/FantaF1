import { describe, expect, it } from 'vitest';
import {
  getSectionNavigationItems,
  getSectionNavigationLeafItems,
  isSectionNavigationGroup,
  sectionNavigationDefinitions,
} from '../src/utils/sectionNavigation';
import { appText } from '../src/uiText';

describe('section navigation', () => {
  it('returns the requested public navigation order with the Analisi submenu', () => {
    const items = getSectionNavigationItems('public');
    const labels = items.map((item) => item.label);

    expect(labels).toEqual([
      appText.shell.navigation.items.calendar,
      appText.shell.navigation.items.predictions,
      appText.shell.navigation.items.weekendLive,
      appText.shell.navigation.items.analysisGroup,
      appText.shell.navigation.items.publicStandings,
      appText.shell.navigation.items.history,
      appText.shell.navigation.items.publicGuide,
    ]);

    const analysisGroup = items.find(isSectionNavigationGroup);
    expect(analysisGroup?.children.map((item) => item.label)).toEqual([
      appText.shell.navigation.items.seasonAnalysis,
      appText.shell.navigation.items.userAnalytics,
      appText.shell.navigation.items.userKpi,
    ]);
  });

  it('returns the requested admin navigation order without exposing results as a top-level menu item', () => {
    const items = getSectionNavigationItems('admin');
    const labels = items.map((item) => item.label);

    expect(labels).toEqual([
      appText.shell.navigation.items.calendar,
      appText.shell.navigation.items.predictions,
      appText.shell.navigation.items.results,
      appText.shell.navigation.items.weekendLive,
      appText.shell.navigation.items.analysisGroup,
      appText.shell.navigation.items.history,
    ]);

    const leafLabels = getSectionNavigationLeafItems('admin').map((item) => item.label);
    expect(leafLabels).toContain(appText.shell.navigation.items.results);
    expect(leafLabels).toContain(appText.shell.navigation.items.seasonAnalysis);
  });

  it('identifies only grouped analysis entries as navigation groups', () => {
    const groupEntry = sectionNavigationDefinitions.find((item) => item.kind === 'group');
    const itemEntry = sectionNavigationDefinitions.find((item) => item.kind === 'item');

    expect(groupEntry && isSectionNavigationGroup(groupEntry)).toBe(true);
    expect(itemEntry && isSectionNavigationGroup(itemEntry)).toBe(false);
  });

  it('keeps every leaf navigation entry mapped to the expected route and section id', () => {
    const publicLeafEntries = getSectionNavigationLeafItems('public');
    const adminLeafEntries = getSectionNavigationLeafItems('admin');

    expect(publicLeafEntries.map((item) => [item.id, item.route])).toEqual([
      ['calendar-section', '/dashboard#calendar-section'],
      ['predictions-section', '/pronostici#predictions-section'],
      ['weekend-live', '/gara#weekend-live'],
      ['season-analysis', '/analisi#season-analysis'],
      ['user-analytics-section', '/analisi#user-analytics-section'],
      ['user-kpi-section', '/analisi#user-kpi-section'],
      ['public-standings', '/classifiche#public-standings'],
      ['history-archive', '/classifiche#history-archive'],
      ['public-guide', '/dashboard#public-guide'],
    ]);

    expect(adminLeafEntries.map((item) => [item.id, item.route])).toEqual([
      ['calendar-section', '/dashboard#calendar-section'],
      ['predictions-section', '/pronostici#predictions-section'],
      ['results-section', '/gara#results-section'],
      ['weekend-live', '/gara#weekend-live'],
      ['season-analysis', '/analisi#season-analysis'],
      ['user-analytics-section', '/analisi#user-analytics-section'],
      ['user-kpi-section', '/analisi#user-kpi-section'],
      ['history-archive', '/classifiche#history-archive'],
    ]);
  });

  it('keeps the race surface mapped to the gara route', () => {
    const adminLeafEntries = getSectionNavigationLeafItems('admin');
    const predictionsEntry = adminLeafEntries.find((item) => item.id === 'predictions-section');
    const resultsEntry = adminLeafEntries.find((item) => item.id === 'results-section');
    const weekendLiveEntry = adminLeafEntries.find((item) => item.id === 'weekend-live');

    expect(predictionsEntry?.route).toBe('/pronostici#predictions-section');
    expect(resultsEntry?.route).toBe('/gara#results-section');
    expect(weekendLiveEntry?.route).toBe('/gara#weekend-live');
  });
});
