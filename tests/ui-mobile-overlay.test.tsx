/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileOverlay from '../src/components/MobileOverlay';
import { appText } from '../src/uiText';
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
    expect(screen.getAllByText('Calendar')).not.toHaveLength(0);
    expect(screen.getAllByText('KPIs')).not.toHaveLength(0);
  });

  it('calls onItemClick and onClose when an item is clicked', () => {
    render(<MobileOverlay {...defaultProps} />);
    fireEvent.click(screen.getAllByText('KPIs')[0]);
    expect(defaultProps.onItemClick).toHaveBeenCalledWith('user-kpi-section');
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
      { id: 'unknown-id' as any, label: 'Unknown' },
    ];
    render(<MobileOverlay {...defaultProps} items={customItems} />);
    expect(screen.getAllByText('Unknown')).not.toHaveLength(0);
  });

  it('uses the fallback icon in the current section summary for an unknown active item', () => {
    const customItems = [{ id: 'unknown-id' as any, label: 'Unknown' }];
    const { container } = render(
      <MobileOverlay {...defaultProps} items={customItems} activeId="unknown-id" />,
    );
    expect(screen.getByText(appText.shell.navigation.currentSection)).toBeInTheDocument();
    expect(container.querySelector('.mobile-nav-current .lucide-gauge')).toBeInTheDocument();
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
});
