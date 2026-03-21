/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../src/components/AppLayout';
import React from 'react';

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

      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
};

describe('AppLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithLayout = (children: React.ReactNode) => {
    return render(
      <MemoryRouter>
        <AppLayout
          items={[]}
          activeId=""
          onItemClick={() => {}}
          isAdmin={false}
          viewMode="public"
          onViewModeToggle={() => {}}
          onLogout={() => {}}
          onLogin={() => {}}
          isSidebarCollapsed={false}
          onCollapseChange={() => {}}
          isMobileNavOpen={false}
          onOpenMobileNav={() => {}}
          onCloseMobileNav={() => {}}
        >
          {children}
        </AppLayout>
      </MemoryRouter>
    );
  };

  it('renders Sidebar on Desktop (wide screen)', () => {
    setMockViewport(1400);
    renderWithLayout(<div>Content</div>);
    // Sidebar should be in the document
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    // Bottom Tab Bar should NOT be in the document (it will be implemented in Task 2.1)
    expect(screen.queryByRole('navigation', { name: /Barra di navigazione mobile/i })).not.toBeInTheDocument();
  });

  it('renders Bottom Tab Bar on Mobile (narrow screen)', () => {
    setMockViewport(600);
    renderWithLayout(<div>Content</div>);
    // Bottom Tab Bar should be in the document
    // This will FAIL initially as AppLayout is not yet implemented or doesn't have it
    expect(screen.getByRole('navigation', { name: /Barra di navigazione mobile/i })).toBeInTheDocument();
  });
});
