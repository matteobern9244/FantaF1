/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileOverlay from '../src/components/MobileOverlay';
import type { SectionNavigationId } from '../src/utils/sectionNavigation';

describe('MobileOverlay Component', () => {
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
    onClose: vi.fn(),
  };

  it('renders all navigation items', () => {
    render(<MobileOverlay {...defaultProps} />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('KPIs')).toBeInTheDocument();
  });

  it('calls onItemClick and onClose when an item is clicked', () => {
    render(<MobileOverlay {...defaultProps} />);
    fireEvent.click(screen.getByText('KPIs'));
    expect(defaultProps.onItemClick).toHaveBeenCalledWith('user-kpi-section');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', () => {
    render(<MobileOverlay {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Close menu'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('highlights the active item', () => {
    render(<MobileOverlay {...defaultProps} />);
    const activeItem = screen.getByText('Calendar').closest('button');
    expect(activeItem).toHaveClass('active');
  });

  it('shows Admin Login when not admin', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={false} />);
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
  });

  it('shows Admin View and Logout when admin', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={true} viewMode="public" />);
    expect(screen.getByText('Admin View')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls onLogin and onClose when Admin Login is clicked', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={false} />);
    fireEvent.click(screen.getByText('Admin Login'));
    expect(defaultProps.onLogin).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onViewModeToggle and onClose when Admin View is clicked', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText('Admin View'));
    expect(defaultProps.onViewModeToggle).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onLogout and onClose when Logout is clicked', () => {
    render(<MobileOverlay {...defaultProps} isAdmin={true} />);
    fireEvent.click(screen.getByText('Logout'));
    expect(defaultProps.onLogout).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
