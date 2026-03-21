/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileOverlay from '../src/components/MobileOverlay';
import { appText } from '../src/uiText';
import type { SectionNavigationEntry, SectionNavigationId } from '../src/utils/sectionNavigation';

describe('MobileOverlay Component', () => {
  const mockItems: SectionNavigationEntry[] = [
    { kind: 'item', id: 'calendar-section', route: '/dashboard#calendar-section', label: 'Calendar', viewModes: ['public', 'admin'] },
    {
      kind: 'group',
      id: 'analysis-group',
      label: 'Analisi',
      viewModes: ['public', 'admin'],
      children: [
        { kind: 'item', id: 'season-analysis', route: '/analisi#season-analysis', label: 'Stagione attuale', viewModes: ['public', 'admin'] },
        { kind: 'item', id: 'user-analytics-section', route: '/analisi#user-analytics-section', label: 'Deep-dive KPI dashboard', viewModes: ['public', 'admin'] },
        { kind: 'item', id: 'user-kpi-section', route: '/analisi#user-kpi-section', label: 'User KPI Dashboard', viewModes: ['public', 'admin'] },
      ],
    },
  ];

  const defaultProps = {
    items: mockItems,
    activeId: 'calendar-section',
    onItemClick: vi.fn(),
    isAdmin: false,
    viewMode: 'public' as const,
    onViewModeToggle: vi.fn(),
    onLogout: vi.fn(),
    onLogin: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders all navigation items', () => {
    render(<MobileOverlay {...defaultProps} />);
    expect(screen.getAllByText('Calendar')).not.toHaveLength(0);
    expect(screen.getByText('Analisi')).toBeInTheDocument();
    expect(screen.getAllByText('Stagione attuale')).not.toHaveLength(0);
    expect(screen.getAllByText('Deep-dive KPI dashboard')).not.toHaveLength(0);
    expect(screen.getAllByText('User KPI Dashboard')).not.toHaveLength(0);
  });

  it('calls onItemClick and onClose when an item is clicked', () => {
    render(<MobileOverlay {...defaultProps} />);
    fireEvent.click(screen.getAllByText('User KPI Dashboard')[0]);
    expect(defaultProps.onItemClick).toHaveBeenCalledWith('user-kpi-section');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onItemClick and onClose when a top-level item is clicked', () => {
    render(<MobileOverlay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(defaultProps.onItemClick).toHaveBeenCalledWith('calendar-section');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', () => {
    render(<MobileOverlay {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(appText.shell.navigation.closeButton));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('highlights the active item', () => {
    render(<MobileOverlay {...defaultProps} />);
    const activeItem = screen.getByRole('button', { name: 'Calendar' });
    expect(activeItem).toHaveClass('active');
    expect(activeItem).toHaveAttribute('aria-current', 'page');
    expect(activeItem.querySelector('.mobile-nav-copy')).toBeInTheDocument();
    expect(activeItem.querySelector('.mobile-nav-label')).toBeInTheDocument();
  });

  it('shows the current section summary using the active item label', () => {
    render(<MobileOverlay {...defaultProps} />);
    const currentSection = screen.getByText(appText.shell.navigation.currentSection);
    expect(currentSection).toBeInTheDocument();
    expect(screen.getAllByText('Calendar')).toHaveLength(2);
    expect(currentSection.closest('.mobile-nav-current')).toBeInTheDocument();
  });

  it('falls back to the first item in the current section summary when the active id is missing', () => {
    render(<MobileOverlay {...defaultProps} activeId="missing-section" />);
    const currentSection = screen.getByText(appText.shell.navigation.currentSection);
    expect(currentSection).toBeInTheDocument();
    expect(screen.getAllByText('Calendar')).toHaveLength(2);
  });

  it('omits the current section summary when the navigation item list is empty', () => {
    render(<MobileOverlay {...defaultProps} items={[]} activeId="missing-section" />);
    expect(screen.queryByText(appText.shell.navigation.currentSection)).not.toBeInTheDocument();
  });

  it('uses fallback icon for unknown items', () => {
    const customItems = [
      ...mockItems,
      { kind: 'item', id: 'unknown-id' as any, route: '/unknown#unknown-id', label: 'Unknown', viewModes: ['public', 'admin'] },
    ];
    render(<MobileOverlay {...defaultProps} items={customItems} />);
    expect(screen.getAllByText('Unknown')).not.toHaveLength(0);
  });

  it('uses the fallback icon in the current section summary for an unknown active item', () => {
    const customItems = [{ kind: 'item', id: 'unknown-id' as any, route: '/unknown#unknown-id', label: 'Unknown', viewModes: ['public', 'admin'] }];
    const { container } = render(
      <MobileOverlay {...defaultProps} items={customItems} activeId="unknown-id" />,
    );
    expect(screen.getByText(appText.shell.navigation.currentSection)).toBeInTheDocument();
    expect(container.querySelector('.mobile-nav-current .lucide-gauge')).toBeInTheDocument();
  });

  it('uses the fallback icon for unknown child items inside the Analisi group', () => {
    const customItems: SectionNavigationEntry[] = [
      { kind: 'item', id: 'calendar-section', route: '/dashboard#calendar-section', label: 'Calendar', viewModes: ['public', 'admin'] },
      {
        kind: 'group',
        id: 'analysis-group',
        label: 'Analisi',
        viewModes: ['public', 'admin'],
        children: [
          { kind: 'item', id: 'unknown-id' as SectionNavigationId, route: '/analisi#unknown-id', label: 'Unknown child', viewModes: ['public', 'admin'] },
        ],
      },
    ];
    const { container } = render(
      <MobileOverlay {...defaultProps} items={customItems} activeId="unknown-id" />,
    );

    expect(screen.getAllByText('Unknown child')).toHaveLength(2);
    expect(container.querySelector('.mobile-nav-subitem .lucide-gauge')).toBeInTheDocument();
  });

  it('shows Admin View icon when in admin mode', () => {
    const { container } = render(<MobileOverlay {...defaultProps} isAdmin={true} viewMode="admin" />);
    // Smartphone icon
    expect(container.querySelector('.lucide-smartphone')).toBeInTheDocument();
  });

  it('shows Admin Login when not admin', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={false} />);
    expect(screen.getByText(appText.shell.navigation.items.adminLogin)).toBeInTheDocument();
  });

  it('shows Admin View and Logout when admin', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={true} viewMode="public" />);
    expect(screen.getByText(appText.shell.navigation.items.adminView)).toBeInTheDocument();
    expect(screen.getByText(appText.shell.navigation.items.logout)).toBeInTheDocument();
  });

  it('calls onLogin and onClose when Admin Login is clicked', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={false} />);
    fireEvent.click(screen.getByText(appText.shell.navigation.items.adminLogin));
    expect(defaultProps.onLogin).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onViewModeToggle and onClose when Admin View is clicked', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText(appText.shell.navigation.items.adminView));
    expect(defaultProps.onViewModeToggle).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onLogout and onClose when Logout is clicked', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText(appText.shell.navigation.items.logout));
    expect(defaultProps.onLogout).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onInstall and onClose when Install App is clicked', () => {
    const onInstall = vi.fn();
    render(<MobileOverlay {...defaultProps} showInstall={true} onInstall={onInstall} />);
    fireEvent.click(screen.getByText(appText.shell.navigation.items.installApp));
    expect(onInstall).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('renders child items after the Analisi group label in the requested order', () => {
    const { container } = render(<MobileOverlay {...defaultProps} />);
    const section = container.querySelector('.mobile-nav-section.section-nav-list');
    const labels = Array.from(
      section?.querySelectorAll('.mobile-nav-group-label, .mobile-nav-item .mobile-nav-label') ?? [],
    ).map((element) => element.textContent?.trim());

    expect(labels).toEqual([
      'Calendar',
      'Analisi',
      'Stagione attuale',
      'Deep-dive KPI dashboard',
      'User KPI Dashboard',
    ]);
  });
});
