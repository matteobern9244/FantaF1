import type { ViewMode } from '../types';
import { appText } from '../uiText';

type SectionNavigationId =
  | 'calendar-section'
  | 'user-kpi-section'
  | 'user-analytics-section'
  | 'public-standings'
  | 'season-analysis'
  | 'weekend-live'
  | 'public-guide'
  | 'predictions-section'
  | 'results-section'
  | 'admin-section'
  | 'history-archive';

type SectionNavigationGroupId = 'analysis-group';

interface SectionNavigationItem {
  kind: 'item';
  id: SectionNavigationId;
  route: string;
  label: string;
  viewModes: ViewMode[];
}

interface SectionNavigationGroup {
  kind: 'group';
  id: SectionNavigationGroupId;
  label: string;
  viewModes: ViewMode[];
  children: SectionNavigationItem[];
}

type SectionNavigationEntry = SectionNavigationItem | SectionNavigationGroup;

const sectionNavigationDefinitions: SectionNavigationEntry[] = [
  {
    kind: 'item',
    id: 'calendar-section',
    route: '/dashboard#calendar-section',
    label: appText.shell.navigation.items.calendar,
    viewModes: ['admin', 'public'],
  },
  {
    kind: 'item',
    id: 'predictions-section',
    route: '/pronostici#predictions-section',
    label: appText.shell.navigation.items.predictions,
    viewModes: ['admin', 'public'],
  },
  {
    kind: 'item',
    id: 'results-section',
    route: '/gara#results-section',
    label: appText.shell.navigation.items.results,
    viewModes: ['admin'],
  },
  {
    kind: 'item',
    id: 'weekend-live',
    route: '/gara#weekend-live',
    label: appText.shell.navigation.items.weekendLive,
    viewModes: ['admin', 'public'],
  },
  {
    kind: 'group',
    id: 'analysis-group',
    label: appText.shell.navigation.items.analysisGroup,
    viewModes: ['admin', 'public'],
    children: [
      {
        kind: 'item',
        id: 'season-analysis',
        route: '/analisi#season-analysis',
        label: appText.shell.navigation.items.seasonAnalysis,
        viewModes: ['admin', 'public'],
      },
      {
        kind: 'item',
        id: 'user-analytics-section',
        route: '/analisi#user-analytics-section',
        label: appText.shell.navigation.items.userAnalytics,
        viewModes: ['admin', 'public'],
      },
      {
        kind: 'item',
        id: 'user-kpi-section',
        route: '/analisi#user-kpi-section',
        label: appText.shell.navigation.items.userKpi,
        viewModes: ['admin', 'public'],
      },
    ],
  },
  {
    kind: 'item',
    id: 'public-standings',
    route: '/classifiche#public-standings',
    label: appText.shell.navigation.items.publicStandings,
    viewModes: ['public'],
  },
  {
    kind: 'item',
    id: 'history-archive',
    route: '/classifiche#history-archive',
    label: appText.shell.navigation.items.history,
    viewModes: ['admin', 'public'],
  },
  {
    kind: 'item',
    id: 'public-guide',
    route: '/dashboard#public-guide',
    label: appText.shell.navigation.items.publicGuide,
    viewModes: ['public'],
  },
];

function getSectionNavigationItems(viewMode: ViewMode): SectionNavigationEntry[] {
  const entries: SectionNavigationEntry[] = [];

  sectionNavigationDefinitions.forEach((item) => {
    if (!item.viewModes.includes(viewMode)) {
      return;
    }

    if (item.kind === 'group') {
      const children = item.children.filter((child) => child.viewModes.includes(viewMode));
      if (children.length > 0) {
        entries.push({ ...item, children });
      }

      return;
    }

    entries.push(item);
  });

  return entries;
}

function getSectionNavigationLeafItems(viewMode: ViewMode): SectionNavigationItem[] {
  const leafItems: SectionNavigationItem[] = [];

  getSectionNavigationItems(viewMode).forEach((item) => {
    if (item.kind === 'group') {
      leafItems.push(...item.children);
      return;
    }

    leafItems.push(item);
  });

  return leafItems;
}

function isSectionNavigationGroup(item: SectionNavigationEntry): item is SectionNavigationGroup {
  return item.kind === 'group';
}

export {
  getSectionNavigationItems,
  getSectionNavigationLeafItems,
  isSectionNavigationGroup,
  sectionNavigationDefinitions,
};
export type {
  SectionNavigationEntry,
  SectionNavigationGroup,
  SectionNavigationGroupId,
  SectionNavigationId,
  SectionNavigationItem,
};
