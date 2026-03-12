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
        constructorStandings={[{ position: 4, team: 'Mercedes', points: 100, color: '#00D2BE' }]}
        driverStandings={[{ position: 4, driverId: 'rus', name: 'George Russell', team: 'Mercedes', points: 56 }]}
        updatedAt="2026-03-12T10:00:00.000Z"
      />,
    );

    expect(screen.getByText('George Russell')).toBeInTheDocument();
    expect(screen.getAllByText('P4')).toHaveLength(2);
    expect(screen.getByText(/ultimo aggiornamento/i)).toBeInTheDocument();
  });

  it('renders constructor rows even when the team color is missing', () => {
    render(
      <PublicStandingsPanel
        constructorStandings={[{ position: 2, team: 'Williams', points: 12 }]}
        driverStandings={[]}
        updatedAt="2026-03-12T10:00:00.000Z"
      />,
    );

    expect(screen.getByText('Williams')).toBeInTheDocument();
    expect(screen.getByText('12 pt')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });
});
