/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../src/components/Sidebar';
import type { SectionNavigationId } from '../src/utils/sectionNavigation';

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
    const toggleButton = screen.getByLabelText('Collapse sidebar');
    
    // Initial state: expanded
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    
    // Collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByText('Calendar')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    
    // Expand
    fireEvent.click(screen.getByLabelText('Expand sidebar'));
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('highlights the active item', () => {
    render(<Sidebar {...defaultProps} />);
    const activeItem = screen.getByText('Calendar').closest('button');
    expect(activeItem).toHaveClass('active');
  });

  it('shows Admin Login when not admin', () => {
    render(<Sidebar {...defaultProps} isAdmin={false} />);
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
  });

  it('shows Admin View and Logout when admin', () => {
    render(<Sidebar {...defaultProps} isAdmin={true} viewMode="public" />);
    expect(screen.getByText('Admin View')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls onLogin when Admin Login is clicked', () => {
    render(<Sidebar {...defaultProps} isAdmin={false} />);
    fireEvent.click(screen.getByText('Admin Login'));
    expect(defaultProps.onLogin).toHaveBeenCalled();
  });

  it('calls onViewModeToggle when Admin View is clicked', () => {
    render(<Sidebar {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText('Admin View'));
    expect(defaultProps.onViewModeToggle).toHaveBeenCalled();
  });

  it('calls onLogout when Logout is clicked', () => {
    render(<Sidebar {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText('Logout'));
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });
});
