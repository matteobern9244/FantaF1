import React, { useEffect, useState } from 'react';
import { Menu, CalendarDays, User, Trophy, Gauge } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileOverlay from './MobileOverlay';
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
  isMobileNavOpen: boolean;
  onOpenMobileNav: () => void;
  onCloseMobileNav: () => void;
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

export function isBottomTabBarItemActive(tabId: string, activeId: string) {
  const activeGroups: Record<string, SectionNavigationId[]> = {
    dashboard: ['calendar-section', 'weekend-live', 'public-guide'],
    predictions: ['predictions-section'],
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
  isMobileNavOpen,
  onOpenMobileNav,
  onCloseMobileNav,
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

      {isMobileNavOpen && (
        <MobileOverlay
          items={items}
          activeId={activeId}
          onItemClick={onItemClick}
          isAdmin={isAdmin}
          viewMode={viewMode}
          onViewModeToggle={onViewModeToggle}
          onLogout={onLogout}
          onLogin={onLogin}
          onClose={onCloseMobileNav}
          showInstall={true}
          onInstall={onInstall}
        />
      )}

      <button
        className="mobile-menu-trigger"
        onClick={onOpenMobileNav}
        aria-label={appText.shell.navigation.openButton}
        type="button"
      >
        <Menu size={24} />
      </button>

      {showBottomTabBar ? (
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
      ) : null}

      {children}
    </div>
  );
};

export default AppLayout;
