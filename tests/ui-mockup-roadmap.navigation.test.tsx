/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { appText } from '../src/uiText';
import {
  cleanupRoadmapDomMocks,
  createAppData,
  renderRoadmapApp,
  setupRoadmapDomMocks,
  setupRoadmapFetch,
} from './helpers/ui-mockup-roadmap-harness';

describe('Mockup roadmap navigation flows', () => {
  beforeEach(() => {
    setupRoadmapDomMocks();
  });

  afterEach(() => {
    cleanupRoadmapDomMocks();
  });

  it('renders the requested public navigation order and mirrors the same dashboard section order', async () => {
    setupRoadmapFetch();
    await renderRoadmapApp(['/dashboard?view=public']);

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    await screen.findByRole('button', { name: appText.shell.navigation.items.publicGuide });

    const navLabels = Array.from(
      navigation.querySelectorAll('.sidebar-group-label, .sidebar-item .sidebar-label'),
    ).map((element) => element.textContent?.trim());

    expect(navLabels).toEqual([
      appText.shell.navigation.items.calendar,
      appText.shell.navigation.items.predictions,
      appText.shell.navigation.items.weekendLive,
      appText.shell.navigation.items.analysisGroup,
      appText.shell.navigation.items.seasonAnalysis,
      appText.shell.navigation.items.userAnalytics,
      appText.shell.navigation.items.userKpi,
      appText.shell.navigation.items.publicStandings,
      appText.shell.navigation.items.history,
      appText.shell.navigation.items.publicGuide,
    ]);
  });

  it('renders navigation directly in the header and updates the hash on navigation', async () => {
    setupRoadmapFetch();
    await renderRoadmapApp(['/dashboard?view=public']);

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    expect(navigation).toBeInTheDocument();
    expect(navigation).toHaveClass('section-nav-list');

    const userAnalyticsButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.userAnalytics });
    fireEvent.click(userAnalyticsButton);

    await screen.findByRole('heading', { name: appText.headings.userAnalytics });
    expect(userAnalyticsButton).toHaveClass('active');
    expect(userAnalyticsButton).toHaveAttribute('aria-current', 'page');
  });

  it('navigates to history even when no archived races exist yet', async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    setupRoadmapFetch({
      appData: {
        ...createAppData(),
        history: [],
      },
    });

    await renderRoadmapApp(['/classifiche']);

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    const historyButton = within(navigation).getByRole('button', { name: appText.shell.navigation.items.history });
    fireEvent.click(historyButton);

    await waitFor(() => {
      const historySection = document.getElementById('history-archive');
      expect(historySection).toBeInTheDocument();
    });
    expect(scrollTo).toHaveBeenCalled();
    expect(historyButton).toHaveClass('active');
  });

  it('routes every public sidebar voice to the matching section and route content', async () => {
    setupRoadmapFetch();
    await renderRoadmapApp(['/dashboard?view=public']);

    const navigation = screen.getByRole('navigation', { name: appText.shell.navigation.ariaLabel });
    await screen.findByRole('button', { name: appText.shell.navigation.items.publicGuide });

    const routeAssertions: Array<{ forbidden: string[]; heading: string; label: string }> = [
      {
        label: appText.shell.navigation.items.calendar,
        heading: appText.headings.calendar,
        forbidden: [
          appText.panels.weekendLive.title,
          appText.panels.publicGuide.title,
        ],
      },
      {
        label: appText.shell.navigation.items.predictions,
        heading: appText.headings.predictionEntry,
        forbidden: [
          appText.headings.calendar,
          appText.panels.weekendLive.title,
          appText.panels.publicGuide.title,
        ],
      },
      {
        label: appText.shell.navigation.items.weekendLive,
        heading: appText.panels.weekendLive.title,
        forbidden: [
          appText.headings.calendar,
          appText.headings.predictionEntry,
          appText.panels.publicGuide.title,
        ],
      },
      {
        label: appText.shell.navigation.items.seasonAnalysis,
        heading: appText.panels.seasonAnalysis.title,
        forbidden: [
          appText.headings.userAnalytics,
          appText.headings.userKpi,
        ],
      },
      {
        label: appText.shell.navigation.items.userAnalytics,
        heading: appText.headings.userAnalytics,
        forbidden: [
          appText.panels.seasonAnalysis.title,
          appText.headings.userKpi,
        ],
      },
      {
        label: appText.shell.navigation.items.userKpi,
        heading: appText.headings.userKpi,
        forbidden: [
          appText.panels.seasonAnalysis.title,
          appText.headings.userAnalytics,
        ],
      },
      {
        label: appText.shell.navigation.items.publicStandings,
        heading: appText.panels.publicStandings.title,
        forbidden: [appText.headings.history],
      },
      {
        label: appText.shell.navigation.items.history,
        heading: appText.headings.history,
        forbidden: [appText.panels.publicStandings.title],
      },
      {
        label: appText.shell.navigation.items.publicGuide,
        heading: appText.panels.publicGuide.title,
        forbidden: [
          appText.headings.calendar,
          appText.panels.weekendLive.title,
        ],
      },
    ];

    for (const { forbidden, label, heading } of routeAssertions) {
      fireEvent.click(within(navigation).getByRole('button', { name: label }));
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();

      for (const forbiddenHeading of forbidden) {
        expect(screen.queryByRole('heading', { name: forbiddenHeading })).not.toBeInTheDocument();
      }
    }
  });
});
