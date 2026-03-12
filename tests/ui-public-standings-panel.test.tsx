/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicStandingsPanel from '../src/components/PublicStandingsPanel';

describe('public standings panel', () => {
  it('renders the empty state without an update timestamp', () => {
    render(
      <PublicStandingsPanel
        constructorStandings={[]}
        driverStandings={[]}
        updatedAt=""
      />,
    );

    expect(screen.getByText(/classifiche reali non disponibili/i)).toBeInTheDocument();
    expect(screen.queryByText(/ultimo aggiornamento/i)).not.toBeInTheDocument();
  });

  it('renders avatar fallbacks and non-podium positions', () => {
    render(
      <PublicStandingsPanel
        constructorStandings={[{ position: 4, team: 'Mercedes', points: 100, color: '#00D2BE', logoUrl: 'https://media.example.com/mercedes-logo.webp' }]}
        driverStandings={[{
          position: 4,
          driverId: 'rus',
          name: 'George Russell',
          team: 'Mercedes',
          points: 56,
          avatarUrl: 'https://media.formula1.com/image/upload/c_lfill,w_64/q_auto/v1740000000/common/f1/2026/mercedes/rusgeo01/2026mercedesrusgeo01right.webp',
        }]}
        updatedAt="2026-03-12T10:00:00.000Z"
      />,
    );

    expect(screen.getByText('George Russell')).toBeInTheDocument();
    expect(screen.getByAltText('George Russell')).toHaveAttribute(
      'src',
      'https://media.formula1.com/image/upload/c_lfill,w_256/q_auto/v1740000000/common/f1/2026/mercedes/rusgeo01/2026mercedesrusgeo01right.webp',
    );
    expect(screen.getByAltText('Mercedes logo')).toHaveAttribute('src', 'https://media.example.com/mercedes-logo.webp');
    expect(screen.getAllByText('P4')).toHaveLength(2);
    expect(screen.getByText(/ultimo aggiornamento/i)).toBeInTheDocument();
  });

  it('renders constructor rows even when the team color or logo is missing', () => {
    render(
      <PublicStandingsPanel
        constructorStandings={[{ position: 2, team: 'Williams', points: 12 }]}
        driverStandings={[]}
        updatedAt="2026-03-12T10:00:00.000Z"
      />,
    );

    const teamName = screen.getByText('Williams');
    expect(teamName).toBeInTheDocument();
    expect(teamName.getAttribute('style')).toBeNull();
    expect(screen.getByText('12 pt')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.queryByAltText(/williams logo/i)).not.toBeInTheDocument();
  });

  it('renders the driver avatar fallback when the public standings image is missing', () => {
    render(
      <PublicStandingsPanel
        constructorStandings={[]}
        driverStandings={[{ position: 5, driverId: 'ver', name: 'Max Verstappen', team: 'Red Bull', points: 49 }]}
        updatedAt="2026-03-12T10:00:00.000Z"
      />,
    );

    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.queryByAltText('Max Verstappen')).not.toBeInTheDocument();
    expect(screen.getByText('Red Bull')).toBeInTheDocument();
  });
});
