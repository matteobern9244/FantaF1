import type { ViewMode } from '../types';
import { appText } from '../uiText';

type SectionNavigationId =
  | 'calendar-section'
  | 'user-kpi-section'
  | 'user-analytics-section'
  | 'season-analysis'
  | 'weekend-live'
  | 'public-guide'
  | 'predictions-section'
  | 'results-section'
  | 'history-archive';

interface SectionNavigationDefinition {
  id: SectionNavigationId;
  label: string;
  viewModes: ViewMode[];
}

const sectionNavigationDefinitions: SectionNavigationDefinition[] = [
  {
    id: 'calendar-section',
    label: appText.shell.navigation.items.calendar,
    viewModes: ['admin', 'public'],
  },
  {
    id: 'user-kpi-section',
    label: appText.shell.navigation.items.userKpi,
    viewModes: ['admin', 'public'],
  },
  {
    id: 'user-analytics-section',
    label: appText.shell.navigation.items.userAnalytics,
    viewModes: ['admin', 'public'],
  },
  {
    id: 'season-analysis',
    label: appText.shell.navigation.items.seasonAnalysis,
    viewModes: ['admin', 'public'],
  },
  {
    id: 'weekend-live',
    label: appText.shell.navigation.items.weekendLive,
    viewModes: ['admin', 'public'],
  },
  {
    id: 'public-guide',
    label: appText.shell.navigation.items.publicGuide,
    viewModes: ['public'],
  },
  {
    id: 'predictions-section',
    label: appText.shell.navigation.items.predictions,
    viewModes: ['admin', 'public'],
  },
  {
    id: 'results-section',
    label: appText.shell.navigation.items.results,
    viewModes: ['admin'],
  },
  {
    id: 'history-archive',
    label: appText.shell.navigation.items.history,
    viewModes: ['admin', 'public'],
  },
];

function getSectionNavigationItems(viewMode: ViewMode) {
  return sectionNavigationDefinitions.filter((item) => item.viewModes.includes(viewMode));
}

export { getSectionNavigationItems, sectionNavigationDefinitions };
export type { SectionNavigationDefinition, SectionNavigationId };
