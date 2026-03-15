/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../src/components/Sidebar';
import type { SectionNavigationId } from '../src/utils/sectionNavigation';
import { appText } from '../src/uiText';

describe('Sidebar Component', () => {
  const mockItems: Array<{ id: SectionNavigationId; label: string }> = [
    { id: 'calendar-section', label: 'Calendar' },
    { id: 'user-kpi-section', label: 'KPIs' },
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
    expect(screen.getByText('KPIs')).toBeInTheDocument();
  });

  it('calls onItemClick when an item is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('KPIs'));
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
  });

  it('uses fallback icon for unknown items', () => {
    const customItems = [
      ...mockItems,
      { id: 'unknown-id' as any, label: 'Unknown' },
    ];
    render(<Sidebar {...defaultProps} items={customItems} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
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
    expect(screen.getByTitle('KPIs')).toBeInTheDocument();
    
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
});
