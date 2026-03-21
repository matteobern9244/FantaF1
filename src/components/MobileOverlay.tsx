import React from 'react';
import {
  X,
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
  LogOut,
  LockKeyhole,
  Download,
  Smartphone,
} from 'lucide-react';
import type { SectionNavigationEntry, SectionNavigationId } from '../utils/sectionNavigation';
import type { ViewMode } from '../types';
import { appText } from '../uiText';
import MenuLogo from './MenuLogo';

interface MobileOverlayProps {
  items: SectionNavigationEntry[];
  activeId: string;
  onItemClick: (id: string) => void;
  isAdmin: boolean;
  viewMode: ViewMode;
  onViewModeToggle: () => void;
  onLogout: () => void;
  onLogin: () => void;
  onClose: () => void;
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
  'admin-section': LockKeyhole,
  'history-archive': History,
};

const MobileOverlay: React.FC<MobileOverlayProps> = ({
  items,
  activeId,
  onItemClick,
  isAdmin,
  viewMode,
  onViewModeToggle,
  onLogout,
  onLogin,
  onClose,
  onInstall,
  showInstall = false,
}) => {
  const navigationLeafItems = items.flatMap((item) => (
    item.kind === 'group'
      ? item.children
      : [item]
  ));
  const currentItem = navigationLeafItems.find((item) => item.id === activeId) ?? navigationLeafItems[0] ?? null;
  const CurrentIcon = currentItem ? iconMap[currentItem.id] || Gauge : Gauge;

  return (
    <div className="mobile-nav-overlay">
      <div className="mobile-nav-header">
        <MenuLogo />
        <button
          className="mobile-nav-close"
          onClick={onClose}
          aria-label={appText.shell.navigation.closeButton}
          type="button"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="mobile-nav-content" aria-label={appText.shell.navigation.ariaLabel}>
        {currentItem && (
          <div className="mobile-nav-current" aria-live="polite">
            <div className="mobile-nav-current-icon" aria-hidden="true">
              <CurrentIcon size={18} />
            </div>
            <div className="mobile-nav-current-copy">
              <span className="mobile-nav-current-kicker">{appText.shell.navigation.currentSection}</span>
              <span className="mobile-nav-current-label">{currentItem.label}</span>
            </div>
          </div>
        )}

        <div className="mobile-nav-section section-nav-list">
          {items.map((item) => {
            if (item.kind === 'group') {
              return (
                <div
                  key={item.id}
                  className={`mobile-nav-group ${item.children.some((child) => child.id === activeId) ? 'active' : ''}`}
                >
                  <div className="mobile-nav-group-header">
                    <span className="mobile-nav-icon" aria-hidden="true">
                      <Gauge size={18} />
                    </span>
                    <span className="mobile-nav-group-label">{item.label}</span>
                  </div>
                  {item.children.map((child) => {
                    const Icon = iconMap[child.id] || Gauge;
                    return (
                      <button
                        key={child.id}
                        className={`mobile-nav-item mobile-nav-subitem ${activeId === child.id ? 'active' : ''}`}
                        aria-current={activeId === child.id ? 'page' : undefined}
                        onClick={() => {
                          onItemClick(child.id);
                          onClose();
                        }}
                        type="button"
                      >
                        <span className="mobile-nav-icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        <span className="mobile-nav-copy">
                          <span className="mobile-nav-label">{child.label}</span>
                        </span>
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
                className={`mobile-nav-item ${activeId === item.id ? 'active' : ''}`}
                aria-current={activeId === item.id ? 'page' : undefined}
                onClick={() => {
                  onItemClick(item.id);
                  onClose();
                }}
                type="button"
              >
                <span className="mobile-nav-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="mobile-nav-copy">
                  <span className="mobile-nav-label">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mobile-nav-divider" />

        <div className="mobile-nav-section footer-section">
          {showInstall && onInstall && (
            <button
              className="mobile-nav-item install-item"
              onClick={() => {
                onInstall();
                onClose();
              }}
              type="button"
            >
              <span className="mobile-nav-icon" aria-hidden="true">
                <Download size={18} />
              </span>
              <span className="mobile-nav-copy">
                <span className="mobile-nav-label">{appText.shell.navigation.items.installApp}</span>
              </span>
            </button>
          )}

          <button
            className={`mobile-nav-item ${viewMode === 'admin' ? 'admin-active' : ''}`}
            onClick={() => {
              if (isAdmin) {
                onViewModeToggle();
              } else {
                onLogin();
              }
              onClose();
            }}
            aria-pressed={viewMode === 'admin'}
            type="button"
          >
            <span className="mobile-nav-icon" aria-hidden="true">
              {isAdmin && viewMode === 'admin' ? <Smartphone size={18} /> : <LockKeyhole size={18} />}
            </span>
            <span className="mobile-nav-copy">
              <span className="mobile-nav-label">
                {isAdmin ? (viewMode === 'admin' ? appText.shell.navigation.items.publicView : appText.shell.navigation.items.adminView) : appText.shell.navigation.items.adminLogin}
              </span>
            </span>
          </button>

          {isAdmin && (
            <button
              className="mobile-nav-item logout-item"
              onClick={() => {
                onLogout();
                onClose();
              }}
              type="button"
            >
              <span className="mobile-nav-icon" aria-hidden="true">
                <LogOut size={18} />
              </span>
              <span className="mobile-nav-copy">
                <span className="mobile-nav-label">{appText.shell.navigation.items.logout}</span>
              </span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

export default MobileOverlay;
