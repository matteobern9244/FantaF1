/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../src/components/Sidebar';
import type { SectionNavigationEntry, SectionNavigationId } from '../src/utils/sectionNavigation';
import { appText } from '../src/uiText';

describe('Sidebar Component', () => {
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
  };

  it('renders all navigation items', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Analisi')).toBeInTheDocument();
    expect(screen.getByText('Stagione attuale')).toBeInTheDocument();
    expect(screen.getByText('Deep-dive KPI dashboard')).toBeInTheDocument();
    expect(screen.getByText('User KPI Dashboard')).toBeInTheDocument();
  });

  it('calls onItemClick when an item is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('User KPI Dashboard'));
    expect(defaultProps.onItemClick).toHaveBeenCalledWith('user-kpi-section');
  });

  it('toggles collapsed state and hides labels', () => {
    render(<Sidebar {...defaultProps} />);
    const toggleButton = screen.getByLabelText(appText.shell.navigation.items.collapseSidebar);
    
    // Initial state: expanded
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    
    // Collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByText('Calendar')).not.toBeInTheDocument();
    expect(screen.getByLabelText(appText.shell.navigation.items.expandSidebar)).toBeInTheDocument();
    
    // Expand
    fireEvent.click(screen.getByLabelText(appText.shell.navigation.items.expandSidebar));
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('highlights the active item', () => {
    render(<Sidebar {...defaultProps} />);
    const activeItem = screen.getByText('Calendar').closest('button');
    expect(activeItem).toHaveClass('active');
    expect(activeItem).toHaveAttribute('aria-current', 'page');
  });

  it('uses fallback icon for unknown items', () => {
    const customItems = [
      ...mockItems,
      { kind: 'item', id: 'unknown-id' as any, route: '/unknown#unknown-id', label: 'Unknown', viewModes: ['public', 'admin'] },
    ];
    render(<Sidebar {...defaultProps} items={customItems} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('uses fallback icon for unknown child items inside the Analisi group', () => {
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

    const { container } = render(<Sidebar {...defaultProps} items={customItems} activeId="unknown-id" />);

    expect(screen.getByText('Unknown child')).toBeInTheDocument();
    expect(container.querySelector('.sidebar-subitem .lucide-gauge')).toBeInTheDocument();
  });

  it('shows Admin Login when not admin', () => {
    render(<Sidebar {...defaultProps} isAdmin={false} />);
    expect(screen.getByText(appText.shell.navigation.items.adminLogin)).toBeInTheDocument();
  });

  it('shows Admin View and Logout when admin', () => {
    render(<Sidebar {...defaultProps} isAdmin={true} viewMode="public" />);
    expect(screen.getByText(appText.shell.navigation.items.adminView)).toBeInTheDocument();
    expect(screen.getByText(appText.shell.navigation.items.logout)).toBeInTheDocument();
  });

  it('calls onLogin when Admin Login is clicked', () => {
    render(<Sidebar {...defaultProps} isAdmin={false} />);
    fireEvent.click(screen.getByText(appText.shell.navigation.items.adminLogin));
    expect(defaultProps.onLogin).toHaveBeenCalled();
  });

  it('calls onViewModeToggle when Admin View is clicked', () => {
    render(<Sidebar {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText(appText.shell.navigation.items.adminView));
    expect(defaultProps.onViewModeToggle).toHaveBeenCalled();
  });

  it('calls onLogout when Logout is clicked', () => {
    render(<Sidebar {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText(appText.shell.navigation.items.logout));
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });

  it('shows tooltips via title attribute when collapsed', () => {
    const onInstall = vi.fn();
    const { unmount } = render(<Sidebar {...defaultProps} isAdmin={true} showInstall={true} onInstall={onInstall} />);
    
    // Collapse
    fireEvent.click(screen.getByLabelText(appText.shell.navigation.items.collapseSidebar));
    
    // Check navigation item title
    expect(screen.getByTitle('Calendar')).toBeInTheDocument();
    expect(screen.getByTitle('Stagione attuale')).toBeInTheDocument();
    expect(screen.getByTitle('Deep-dive KPI dashboard')).toBeInTheDocument();
    expect(screen.getByTitle('User KPI Dashboard')).toBeInTheDocument();
    
    // Check footer items titles
    expect(screen.getByTitle(appText.shell.navigation.items.installApp)).toBeInTheDocument();
    expect(screen.getByTitle(appText.shell.navigation.items.adminView)).toBeInTheDocument();
    expect(screen.getByTitle(appText.shell.navigation.items.logout)).toBeInTheDocument();

    unmount();

    // Check admin toggle title when in admin mode
    render(<Sidebar {...defaultProps} isAdmin={true} viewMode="admin" />);
    fireEvent.click(screen.getByLabelText(appText.shell.navigation.items.collapseSidebar));
    expect(screen.getByTitle(appText.shell.navigation.items.publicView)).toBeInTheDocument();
  });

  it('notifies the parent when collapsed state changes', () => {
    const onCollapseChange = vi.fn();
    render(<Sidebar {...defaultProps} onCollapseChange={onCollapseChange} />);

    fireEvent.click(screen.getByLabelText(appText.shell.navigation.items.collapseSidebar));
    fireEvent.click(screen.getByLabelText(appText.shell.navigation.items.expandSidebar));

    expect(onCollapseChange).toHaveBeenNthCalledWith(1, true);
    expect(onCollapseChange).toHaveBeenNthCalledWith(2, false);
  });

  it('renders child items after the Analisi group label in the requested order', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const navigation = container.querySelector('.sidebar-nav');
    const labels = Array.from(navigation?.querySelectorAll('.sidebar-group-label, .sidebar-item .sidebar-label') ?? []).map(
      (element) => element.textContent?.trim(),
    );

    expect(labels).toEqual([
      'Calendar',
      'Analisi',
      'Stagione attuale',
      'Deep-dive KPI dashboard',
      'User KPI Dashboard',
    ]);
  });
});
