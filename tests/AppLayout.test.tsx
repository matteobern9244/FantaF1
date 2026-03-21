/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../src/components/AppLayout';
import React from 'react';
import { getSectionNavigationItems } from '../src/utils/sectionNavigation';

const mediaQueryListeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();

// Mock matchMedia for responsive tests
const setMockViewport = (width: number) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => {
      const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);
      const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
      
      let matches = false;
      if (maxWidthMatch) {
        matches = width <= parseInt(maxWidthMatch[1]);
      } else if (minWidthMatch) {
        matches = width >= parseInt(minWidthMatch[1]);
      }

      const listeners = mediaQueryListeners.get(query) ?? new Set<(event: MediaQueryListEvent) => void>();
      mediaQueryListeners.set(query, listeners);

      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
          if (eventName === 'change') {
            listeners.add(listener);
          }
        }),
        removeEventListener: vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
          if (eventName === 'change') {
            listeners.delete(listener);
          }
        }),
        dispatchEvent: vi.fn(),
      };
    }),
  });
};

const emitViewportChange = (query: string, matches: boolean) => {
  for (const listener of mediaQueryListeners.get(query) ?? []) {
    listener({ matches, media: query } as MediaQueryListEvent);
  }
};

describe('AppLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaQueryListeners.clear();
  });

  const renderWithLayout = ({
    activeId = 'calendar-section',
    children = <div>Content</div>,
    onItemClick = () => {},
    items = getSectionNavigationItems('public'),
    isAdmin = false,
    viewMode = 'public',
    isMobileNavOpen = false,
    onCloseMobileNav = () => {},
  }: {
    activeId?: string;
    children?: React.ReactNode;
    onItemClick?: (id: string) => void;
    items?: ReturnType<typeof getSectionNavigationItems>;
    isAdmin?: boolean;
    viewMode?: 'public' | 'admin';
    isMobileNavOpen?: boolean;
    onCloseMobileNav?: () => void;
  }) => {
    return render(
      <MemoryRouter>
        <AppLayout
          items={items}
          activeId={activeId}
          onItemClick={onItemClick}
          isAdmin={isAdmin}
          viewMode={viewMode}
          onViewModeToggle={() => {}}
          onLogout={() => {}}
          onLogin={() => {}}
          isSidebarCollapsed={false}
          onCollapseChange={() => {}}
          isMobileNavOpen={isMobileNavOpen}
          onOpenMobileNav={() => {}}
          onCloseMobileNav={onCloseMobileNav}
          onInstall={() => {}}
        >
          {children}
        </AppLayout>
      </MemoryRouter>
    );
  };

  it('renders Sidebar on Desktop (wide screen)', () => {
    setMockViewport(1400);
    renderWithLayout({});
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /Barra di navigazione mobile/i })).not.toBeInTheDocument();
  });

  it('renders interactive bottom tabs on mobile and routes analysis to the first analysis page', () => {
    setMockViewport(600);
    const onItemClick = vi.fn();
    renderWithLayout({ onItemClick });

    const bottomTabBar = screen.getByRole('navigation', { name: /Barra di navigazione mobile/i });
    expect(bottomTabBar).toBeInTheDocument();
    expect(within(bottomTabBar).getByRole('button', { name: /Calendario stagione/i })).toBeInTheDocument();
    expect(within(bottomTabBar).getByRole('button', { name: /Pronostici dei giocatori/i })).toBeInTheDocument();
    expect(within(bottomTabBar).getByRole('button', { name: /Classifiche reali/i })).toBeInTheDocument();
    expect(within(bottomTabBar).getByRole('button', { name: /^Analisi$/i })).toBeInTheDocument();

    fireEvent.click(within(bottomTabBar).getByRole('button', { name: /^Analisi$/i }));
    expect(onItemClick).toHaveBeenCalledWith('season-analysis');
  });

  it('marks the analysis tab as active when an analysis sub-route is selected', () => {
    setMockViewport(600);
    renderWithLayout({ activeId: 'user-kpi-section' });

    const bottomTabBar = screen.getByRole('navigation', { name: /Barra di navigazione mobile/i });
    expect(within(bottomTabBar).getByRole('button', { name: /^Analisi$/i })).toHaveAttribute('aria-current', 'page');
  });

  it('uses the history entry for the standings slot in admin mobile view', () => {
    setMockViewport(600);
    const onItemClick = vi.fn();
    renderWithLayout({
      activeId: 'history-archive',
      items: getSectionNavigationItems('admin'),
      isAdmin: true,
      viewMode: 'admin',
      onItemClick,
    });

    const bottomTabBar = screen.getByRole('navigation', { name: /Barra di navigazione mobile/i });
    const historyButton = within(bottomTabBar).getByRole('button', { name: /storico gare/i });

    expect(historyButton).toHaveAttribute('aria-current', 'page');

    fireEvent.click(historyButton);
    expect(onItemClick).toHaveBeenCalledWith('history-archive');
  });

  it('renders the mobile overlay when the drawer is open', () => {
    setMockViewport(600);
    const onCloseMobileNav = vi.fn();
    renderWithLayout({
      isMobileNavOpen: true,
      onCloseMobileNav,
    });

    const closeButtons = screen.getAllByRole('button', { name: /chiudi sezioni/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(closeButtons[1]);
    expect(onCloseMobileNav).toHaveBeenCalledTimes(1);
  });

  it('updates the bottom tab bar when the viewport crosses the mobile breakpoint', () => {
    setMockViewport(1400);
    renderWithLayout({});

    expect(screen.queryByRole('navigation', { name: /Barra di navigazione mobile/i })).not.toBeInTheDocument();

    act(() => {
      emitViewportChange('(max-width: 1199px)', true);
    });

    expect(screen.getByRole('navigation', { name: /Barra di navigazione mobile/i })).toBeInTheDocument();
  });
});
