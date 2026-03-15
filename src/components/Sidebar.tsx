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
import type { SectionNavigationId } from '../utils/sectionNavigation';
import type { ViewMode } from '../types';
import { appText } from '../uiText';
import MenuLogo from './MenuLogo';

interface SidebarProps {
  items: Array<{ id: SectionNavigationId; label: string }>;
  activeId: string;
  onItemClick: (id: string) => void;
  isAdmin: boolean;
  viewMode: ViewMode;
  onViewModeToggle: () => void;
  onLogout: () => void;
  onLogin: () => void;
  onInstall?: () => void;
  showInstall?: boolean;
}

const iconMap: Record<SectionNavigationId, React.ComponentType<{ size?: number }>> = {
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
  onInstall,
  showInstall = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <MenuLogo />}
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav section-nav-list" aria-label={appText.shell.navigation.ariaLabel}>
        {items.map((item) => {
          const Icon = iconMap[item.id] || Gauge;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${activeId === item.id ? 'active' : ''}`}
              onClick={() => onItemClick(item.id)}
              title={isCollapsed ? item.label : ''}
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
            title={isCollapsed ? appText.shell.navigation.items.installApp || 'Install PWA' : ''}
          >
            <Download size={20} />
            {!isCollapsed && (
              <span className="sidebar-label">
                {appText.shell.navigation.items.installApp || 'Installa App'}
              </span>
            )}
          </button>
        )}

        <button
          className={`sidebar-item ${viewMode === 'admin' ? 'admin-active' : ''}`}
          onClick={isAdmin ? onViewModeToggle : onLogin}
          aria-pressed={viewMode === 'admin'}
          title={isCollapsed ? (isAdmin ? (viewMode === 'admin' ? 'Switch to Public' : 'Switch to Admin') : 'Admin Login') : ''}
        >
          {isAdmin && viewMode === 'admin' ? <Smartphone size={20} /> : <LockKeyhole size={20} />}
          {!isCollapsed && (
            <span className="sidebar-label">
              {isAdmin ? (viewMode === 'admin' ? 'Public View' : 'Admin View') : 'Admin Login'}
            </span>
          )}
        </button>

        {isAdmin && (
          <button
            className="sidebar-item logout-item"
            onClick={onLogout}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="sidebar-label">Logout</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
