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
});
