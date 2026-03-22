import React, { useEffect, useState } from 'react';
import { CalendarDays, User, Trophy, Gauge, Timer, Download, LockKeyhole, LogOut, Smartphone } from 'lucide-react';
import Sidebar from './Sidebar';
import { SectionNavigationEntry, SectionNavigationId } from '../utils/sectionNavigation';
import { ViewMode } from '../types';
import { appText } from '../uiText';

interface AppLayoutProps {
  children: React.ReactNode;
  items: SectionNavigationEntry[];
  activeId: string;
  onItemClick: (id: string) => void;
  isAdmin: boolean;
  viewMode: ViewMode;
  onViewModeToggle: () => void;
  onLogout: () => void;
  onLogin: () => void;
  isSidebarCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
  onInstall: () => void;
}

interface BottomTabBarItem {
  icon: React.ComponentType<{ size?: number | string }>;
  id: string;
  label: string;
  targetId: SectionNavigationId;
}

const bottomTabIconMap: Record<string, React.ComponentType<{ size?: number | string }>> = {
  dashboard: CalendarDays,
  predictions: User,
  race: Timer,
  standings: Trophy,
  analysis: Gauge,
};

function buildBottomTabBarItems(items: SectionNavigationEntry[]): BottomTabBarItem[] {
  const leafItems = items.flatMap((item) => (item.kind === 'group' ? item.children : [item]));
  const analysisGroup = items.find(
    (item): item is Extract<SectionNavigationEntry, { kind: 'group' }> => item.kind === 'group' && item.id === 'analysis-group',
  );
  const calendarItem = leafItems.find((item) => item.id === 'calendar-section');
  const predictionsItem = leafItems.find((item) => item.id === 'predictions-section');
  const raceItem =
    leafItems.find((item) => item.id === 'weekend-live')
    ?? leafItems.find((item) => item.id === 'results-section');
  const standingsItem =
    leafItems.find((item) => item.id === 'public-standings')
    ?? leafItems.find((item) => item.id === 'history-archive');
  const analysisItem = analysisGroup?.children[0];
  const definitions = [
    calendarItem
      ? {
          icon: bottomTabIconMap.dashboard,
          id: 'dashboard',
          label: calendarItem.label,
          targetId: calendarItem.id,
        }
      : null,
    predictionsItem
      ? {
          icon: bottomTabIconMap.predictions,
          id: 'predictions',
          label: predictionsItem.label,
          targetId: predictionsItem.id,
        }
      : null,
    raceItem
      ? {
          icon: bottomTabIconMap.race,
          id: 'race',
          label: raceItem.label,
          targetId: raceItem.id,
        }
      : null,
    standingsItem
      ? {
          icon: bottomTabIconMap.standings,
          id: 'standings',
          label: standingsItem.label,
          targetId: standingsItem.id,
        }
      : null,
    analysisItem && analysisGroup
      ? {
          icon: bottomTabIconMap.analysis,
          id: 'analysis',
          label: analysisGroup.label,
          targetId: analysisItem.id,
        }
      : null,
  ];

  return definitions.filter((item): item is BottomTabBarItem => Boolean(item));
}

// eslint-disable-next-line react-refresh/only-export-components
export function isBottomTabBarItemActive(tabId: string, activeId: string) {
  const activeGroups: Record<string, SectionNavigationId[]> = {
    dashboard: ['calendar-section', 'public-guide'],
    predictions: ['predictions-section'],
    race: ['weekend-live', 'results-section'],
    standings: ['public-standings', 'history-archive'],
    analysis: ['season-analysis', 'user-analytics-section', 'user-kpi-section'],
  };

  return activeGroups[tabId]?.includes(activeId as SectionNavigationId) ?? false;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  items,
  activeId,
  onItemClick,
  isAdmin,
  viewMode,
  onViewModeToggle,
  onLogout,
  onLogin,
  isSidebarCollapsed,
  onCollapseChange,
  onInstall,
}) => {
  const [showBottomTabBar, setShowBottomTabBar] = useState(() =>
    window.matchMedia('(max-width: 1199px)').matches,
  );
  const bottomTabBarItems = buildBottomTabBarItems(items);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1199px)');

    const handler = (event: MediaQueryListEvent) => {
      setShowBottomTabBar(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    setShowBottomTabBar(mediaQuery.matches);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'app-shell-sidebar-collapsed' : ''}`.trim()}>
      <Sidebar
        items={items}
        activeId={activeId}
        onItemClick={onItemClick}
        isAdmin={isAdmin}
        viewMode={viewMode}
        onViewModeToggle={onViewModeToggle}
        onLogout={onLogout}
        onLogin={onLogin}
        onCollapseChange={onCollapseChange}
        showInstall={true}
        onInstall={onInstall}
      />

      {showBottomTabBar ? (
        <div className="mobile-navigation-stack">
          <div className="mobile-utility-bar" aria-label={appText.shell.navigation.items.mobileActions}>
            <button className="mobile-utility-button" onClick={onInstall} type="button">
              <Download size={18} />
              <span>{appText.shell.navigation.items.installAppShort}</span>
            </button>

            <button
              className={`mobile-utility-button ${viewMode === 'admin' ? 'admin-active' : ''}`.trim()}
              onClick={isAdmin ? onViewModeToggle : onLogin}
              aria-pressed={viewMode === 'admin'}
              type="button"
            >
              {isAdmin && viewMode === 'admin' ? <Smartphone size={18} /> : <LockKeyhole size={18} />}
              <span>
                {isAdmin
                  ? (viewMode === 'admin'
                    ? appText.shell.navigation.items.publicViewShort
                    : appText.shell.navigation.items.adminViewShort)
                  : appText.shell.navigation.items.adminLoginShort}
              </span>
            </button>

            {isAdmin ? (
              <button className="mobile-utility-button" onClick={onLogout} type="button">
                <LogOut size={18} />
                <span>{appText.shell.navigation.items.logoutShort}</span>
              </button>
            ) : null}
          </div>

          <nav className="bottom-tab-bar" aria-label={appText.shell.navigation.bottomTabBar}>
            {bottomTabBarItems.map((item) => {
              const Icon = item.icon;
              const isActive = isBottomTabBarItemActive(item.id, activeId);

              return (
                <button
                  key={item.id}
                  className={`bottom-tab-item ${isActive ? 'active' : ''}`.trim()}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onItemClick(item.targetId)}
                  type="button"
                >
                  <span className="bottom-tab-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="bottom-tab-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}

      {children}
    </div>
  );
};

export default AppLayout;
