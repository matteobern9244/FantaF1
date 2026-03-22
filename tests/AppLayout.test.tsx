/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout, { isBottomTabBarItemActive } from '../src/components/AppLayout';
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
  }: {
    activeId?: string;
    children?: React.ReactNode;
    onItemClick?: (id: string) => void;
    items?: ReturnType<typeof getSectionNavigationItems>;
    isAdmin?: boolean;
    viewMode?: 'public' | 'admin';
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
    expect(within(bottomTabBar).getByRole('button', { name: /Weekend pulse/i })).toBeInTheDocument();
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

  it('renders the mobile utility actions instead of the legacy overlay', () => {
    setMockViewport(600);
    const { container } = renderWithLayout({});
    const utilityBar = container.querySelector('.mobile-utility-bar');

    expect(container.querySelector('.mobile-menu-trigger')).toBeNull();
    expect(utilityBar).not.toBeNull();
    expect(within(utilityBar as HTMLElement).getByRole('button', { name: /installa/i })).toBeInTheDocument();
    expect(within(utilityBar as HTMLElement).getByRole('button', { name: /accedi/i })).toBeInTheDocument();
  });

  it('renders bottom tab bar with no tabs when nav items do not include the expected section ids', () => {
    setMockViewport(600);
    const minimalItems: ReturnType<typeof getSectionNavigationItems> = [
      {
        kind: 'item',
        id: 'results-section',
        route: '/results',
        label: 'Results',
        viewModes: ['public', 'admin'],
      },
    ];
    renderWithLayout({ items: minimalItems, activeId: 'results-section' });

    const bottomTabBar = screen.getByRole('navigation', { name: /Barra di navigazione mobile/i });
    expect(bottomTabBar).toBeInTheDocument();
    expect(within(bottomTabBar).queryByRole('button', { name: /Calendario stagione/i })).not.toBeInTheDocument();
    expect(within(bottomTabBar).queryByRole('button', { name: /Pronostici/i })).not.toBeInTheDocument();
    expect(within(bottomTabBar).queryByRole('button', { name: /Classifiche/i })).not.toBeInTheDocument();
    expect(within(bottomTabBar).queryByRole('button', { name: /Analisi/i })).not.toBeInTheDocument();
  });

  it('omits only the missing race tab when the mobile nav lacks race entries', () => {
    setMockViewport(600);
    const items = getSectionNavigationItems('public').filter((item) => {
      if (item.kind === 'group') {
        return true;
      }

      return item.id !== 'weekend-live';
    });

    renderWithLayout({ items });

    const bottomTabBar = screen.getByRole('navigation', { name: /Barra di navigazione mobile/i });
    expect(within(bottomTabBar).getByRole('button', { name: /Calendario stagione/i })).toBeInTheDocument();
    expect(within(bottomTabBar).queryByRole('button', { name: /Weekend pulse/i })).not.toBeInTheDocument();
  });

  it('shows the admin shortcut label when the mobile utility bar is in public mode with an admin session', () => {
    setMockViewport(600);
    const { container } = renderWithLayout({
      isAdmin: true,
      viewMode: 'public',
      items: getSectionNavigationItems('admin'),
    });

    const utilityBar = container.querySelector('.mobile-utility-bar');
    expect(utilityBar).not.toBeNull();
    expect(within(utilityBar as HTMLElement).getByRole('button', { name: /admin/i })).toBeInTheDocument();
    expect(within(utilityBar as HTMLElement).getByRole('button', { name: /esci/i })).toBeInTheDocument();
  });

  it('marks no tab as active when activeId does not match any known section', () => {
    setMockViewport(600);
    renderWithLayout({ activeId: 'nonexistent-section' });

    const bottomTabBar = screen.getByRole('navigation', { name: /Barra di navigazione mobile/i });
    const buttons = within(bottomTabBar).queryAllByRole('button');
    for (const button of buttons) {
      expect(button).not.toHaveAttribute('aria-current', 'page');
    }
  });

  it('returns false for unknown tabId', () => {
    expect(isBottomTabBarItemActive('unknown-tab', 'calendar-section')).toBe(false);
  });

  it('applies app-shell-sidebar-collapsed class when sidebar is collapsed', () => {
    setMockViewport(1400);
    render(
      <MemoryRouter>
        <AppLayout
          items={getSectionNavigationItems('public')}
          activeId="calendar-section"
          onItemClick={() => {}}
          isAdmin={false}
          viewMode="public"
          onViewModeToggle={() => {}}
          onLogout={() => {}}
          onLogin={() => {}}
          isSidebarCollapsed={true}
          onCollapseChange={() => {}}
          onInstall={() => {}}
        >
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );
    // verifica che il container radice abbia la classe collapsed
    const shell = document.querySelector('.app-shell');
    expect(shell).toHaveClass('app-shell-sidebar-collapsed');
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
