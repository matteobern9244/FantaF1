/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { appText } from '../src/uiText';
import {
  cleanupRoadmapDomMocks,
  renderRoadmapApp,
  setupRoadmapDomMocks,
  setupRoadmapFetch,
} from './helpers/ui-mockup-roadmap-harness';

describe('Mockup roadmap shell flows', () => {
  beforeEach(() => {
    setupRoadmapDomMocks();
  });

  afterEach(() => {
    cleanupRoadmapDomMocks();
  });

  it('switches between public and admin modes and keeps editing controls admin-only', async () => {
    setupRoadmapFetch();

    await renderRoadmapApp(['/pronostici']);

    expect(screen.queryByText(appText.panels.publicGuide.title)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicView })[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: appText.shell.navigation.items.savePredictions })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: appText.shell.navigation.items.publicView })[0]);

    await screen.findByText(appText.history.publicReadonly);
    expect(
      screen.queryByRole('button', { name: appText.shell.navigation.items.confirmResults }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.editRace })).not.toBeInTheDocument();
    expect(screen.getByText(appText.history.publicReadonly)).toBeInTheDocument();
  });

  it('renders season analysis surfaces for the selected user and latest GP recap', async () => {
    setupRoadmapFetch();

    const initialView = await renderRoadmapApp(['/analisi']);

    expect(screen.getByRole('heading', { name: appText.panels.seasonAnalysis.title })).toBeInTheDocument();
    expect(screen.getByText(appText.panels.seasonAnalysis.narratives.charge.title)).toBeInTheDocument();
    expect(screen.getByText(appText.panels.seasonAnalysis.latestGpTitle)).toBeInTheDocument();

    const recapSection = screen.getByText(appText.panels.seasonAnalysis.latestGpTitle).closest('.analytics-subpanel');
    expect(recapSection).not.toBeNull();
    expect(within(recapSection as HTMLElement).getByText(/gran premio di gran bretagna/i)).toBeInTheDocument();

    const seasonPanel = screen.getByRole('heading', { name: appText.panels.seasonAnalysis.title }).closest('section');
    expect(seasonPanel).not.toBeNull();
    expect((seasonPanel as HTMLElement).querySelectorAll('.analytics-card.interactive-surface').length).toBeGreaterThan(0);
    expect((seasonPanel as HTMLElement).querySelectorAll('.analytics-subpanel.interactive-surface').length).toBeGreaterThan(0);
    expect((seasonPanel as HTMLElement).querySelectorAll('.season-comparison-row.interactive-surface').length).toBeGreaterThan(0);

    initialView.unmount();
    const analyticsView = await renderRoadmapApp(['/analisi#user-analytics-section']);

    const analyticsPanel = await screen.findByRole('heading', { name: appText.headings.userAnalytics });
    const analyticsSection = analyticsPanel.closest('section');
    expect(analyticsSection).not.toBeNull();
    expect(within(analyticsSection as HTMLElement).getByText(/hamilton lewis/i)).toBeInTheDocument();
    expect(within(analyticsSection as HTMLElement).getAllByText(/gran premio di gran bretagna/i).length).toBeGreaterThan(0);

    analyticsView.unmount();
    await renderRoadmapApp(['/analisi#user-kpi-section']);

    const kpiPanel = await screen.findByTestId('user-kpi-dashboard');
    const kpiCards = within(kpiPanel).getAllByRole('article');
    expect(screen.getByRole('heading', { name: appText.headings.userKpi })).toBeInTheDocument();
    expect(within(kpiCards[0]).getByText('9')).toBeInTheDocument();
    expect(within(kpiCards[2]).getByText('0%')).toBeInTheDocument();
  });

  it('renders the public guide in public mode', async () => {
    setupRoadmapFetch();

    await renderRoadmapApp(['/dashboard?view=public']);

    fireEvent.click(
      await screen.findByRole('button', { name: appText.shell.navigation.items.publicGuide }),
    );

    expect(await screen.findByRole('heading', { name: appText.panels.publicGuide.title })).toBeInTheDocument();
    expect(screen.getByText(appText.panels.publicGuide.raceLockLabel)).toBeInTheDocument();
    expect(screen.getByText(appText.panels.publicGuide.liveViewLabel)).toBeInTheDocument();
  });

  it('does not grant admin access from a shared admin url when the session is not admin', async () => {
    setupRoadmapFetch({
      sessionState: { isAdmin: false, defaultViewMode: 'public' },
    });

    await renderRoadmapApp(['/pronostici?view=admin']);

    expect(screen.getByRole('button', { name: appText.shell.navigation.items.adminLogin })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: appText.shell.navigation.items.savePredictions })).not.toBeInTheDocument();
    expect(screen.getByText(appText.history.publicReadonly)).toBeInTheDocument();
  });
});
