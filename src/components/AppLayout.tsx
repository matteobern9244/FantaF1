import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileOverlay from './MobileOverlay';
import { SectionNavigationEntry } from '../utils/sectionNavigation';
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
        <nav className="bottom-tab-bar" aria-label="Barra di navigazione mobile" />
      ) : null}

      {children}
    </div>
  );
};

export default AppLayout;
