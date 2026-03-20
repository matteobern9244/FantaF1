import React, { useState } from 'react';
import {
  CalendarDays,
  BarChart3,
  Trophy,
  Zap,
  Gauge,
  Timer,
  ShieldCheck,
  User,
  ListChecks,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LockKeyhole,
  Download,
  Smartphone,
} from 'lucide-react';
import type { SectionNavigationEntry, SectionNavigationId } from '../utils/sectionNavigation';
import type { ViewMode } from '../types';
import { appText } from '../uiText';
import MenuLogo from './MenuLogo';

interface SidebarProps {
  items: SectionNavigationEntry[];
  activeId: string;
  onItemClick: (id: string) => void;
  isAdmin: boolean;
  viewMode: ViewMode;
  onViewModeToggle: () => void;
  onLogout: () => void;
  onLogin: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
  onInstall?: () => void;
  showInstall?: boolean;
}

const iconMap: Record<SectionNavigationId, React.ComponentType<{ size?: number | string }>> = {
  'calendar-section': CalendarDays,
  'user-kpi-section': BarChart3,
  'user-analytics-section': Zap,
  'public-standings': Trophy,
  'season-analysis': Gauge,
  'weekend-live': Timer,
  'public-guide': ShieldCheck,
  'predictions-section': User,
  'results-section': ListChecks,
  'history-archive': History,
};

const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeId,
  onItemClick,
  isAdmin,
  viewMode,
  onViewModeToggle,
  onLogout,
  onLogin,
  onCollapseChange,
  onInstall,
  showInstall = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleToggleCollapse() {
    const nextCollapsedState = !isCollapsed;
    setIsCollapsed(nextCollapsedState);
    onCollapseChange?.(nextCollapsedState);
  }

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <MenuLogo />}
        <button
          className="sidebar-toggle"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? appText.shell.navigation.items.expandSidebar : appText.shell.navigation.items.collapseSidebar}
          type="button"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav section-nav-list" aria-label={appText.shell.navigation.ariaLabel}>
        {items.map((item) => {
          if (item.kind === 'group') {
            return (
              <div
                key={item.id}
                className={`sidebar-group ${item.children.some((child) => child.id === activeId) ? 'active' : ''}`}
              >
                <div className="sidebar-group-header" title={isCollapsed ? item.label : ''}>
                  <Gauge size={20} />
                  {!isCollapsed && <span className="sidebar-group-label">{item.label}</span>}
                </div>
                {item.children.map((child) => {
                  const Icon = iconMap[child.id] || Gauge;
                  return (
                    <button
                      key={child.id}
                      className={`sidebar-item sidebar-subitem ${activeId === child.id ? 'active' : ''}`}
                      aria-current={activeId === child.id ? 'page' : undefined}
                      onClick={() => onItemClick(child.id)}
                      title={isCollapsed ? child.label : ''}
                      type="button"
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="sidebar-label">{child.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          }

          const Icon = iconMap[item.id] || Gauge;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${activeId === item.id ? 'active' : ''}`}
              aria-current={activeId === item.id ? 'page' : undefined}
              onClick={() => onItemClick(item.id)}
              title={isCollapsed ? item.label : ''}
              type="button"
            >
              <Icon size={20} />
              {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {showInstall && onInstall && (
          <button
            className="sidebar-item install-item"
            onClick={onInstall}
            title={isCollapsed ? appText.shell.navigation.items.installApp : ''}
            type="button"
          >
            <Download size={20} />
            {!isCollapsed && (
              <span className="sidebar-label">
                {appText.shell.navigation.items.installApp}
              </span>
            )}
          </button>
        )}

        <button
          className={`sidebar-item ${viewMode === 'admin' ? 'admin-active' : ''}`}
          onClick={isAdmin ? onViewModeToggle : onLogin}
          aria-pressed={viewMode === 'admin'}
          title={isCollapsed ? (isAdmin ? (viewMode === 'admin' ? appText.shell.navigation.items.publicView : appText.shell.navigation.items.adminView) : appText.shell.navigation.items.adminLogin) : ''}
          type="button"
        >
          {isAdmin && viewMode === 'admin' ? <Smartphone size={20} /> : <LockKeyhole size={20} />}
          {!isCollapsed && (
            <span className="sidebar-label">
              {isAdmin ? (viewMode === 'admin' ? appText.shell.navigation.items.publicView : appText.shell.navigation.items.adminView) : appText.shell.navigation.items.adminLogin}
            </span>
          )}
        </button>

        {isAdmin && (
          <button
            className="sidebar-item logout-item"
            onClick={onLogout}
            title={isCollapsed ? appText.shell.navigation.items.logout : ''}
            type="button"
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="sidebar-label">{appText.shell.navigation.items.logout}</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
