/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { appText } from '../src/uiText';
import {
  cleanupRoadmapDomMocks,
  mockMediaMatches,
  renderRoadmapApp,
  setupRoadmapDomMocks,
  setupRoadmapFetch,
} from './helpers/ui-mockup-roadmap-harness';

describe('Mockup roadmap mobile and observer navigation flows', () => {
  beforeEach(() => {
    setupRoadmapDomMocks();
  });

  afterEach(() => {
    cleanupRoadmapDomMocks();
  });

  it('opens the mobile menu with the localized trigger and restores body scrolling when it closes', async () => {
    setupRoadmapFetch();
    mockMediaMatches({ '(max-width: 767px)': true });

    await renderRoadmapApp(['/dashboard']);

    const mobileTrigger = screen.getByRole('button', { name: appText.shell.navigation.openButton });
    fireEvent.click(mobileTrigger);

    const overlay = document.querySelector('.mobile-nav-overlay');
    expect(overlay).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');

    fireEvent.click(within(overlay as HTMLElement).getByRole('button', { name: appText.shell.navigation.closeButton }));

    await waitFor(() => {
      expect(document.querySelector('.mobile-nav-overlay')).toBeNull();
    });

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');
  }, 15000);

  it('aligns the mobile third menu item to the navigation anchor and keeps it active after reopening the overlay', async () => {
    setupRoadmapFetch();
    mockMediaMatches({ '(max-width: 900px)': true });
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 320,
      writable: true,
    });

    await renderRoadmapApp(['/analisi#user-analytics-section']);

    const thirdSection = document.getElementById('user-analytics-section');
    expect(thirdSection).not.toBeNull();
    Object.defineProperty(thirdSection as HTMLElement, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 580 }),
    });

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.openButton }));
    const overlay = document.querySelector('.mobile-nav-overlay');
    expect(overlay).not.toBeNull();

    const thirdButton = within(overlay as HTMLElement).getByRole('button', {
      name: appText.shell.navigation.items.userAnalytics,
    });
    fireEvent.click(thirdButton);

    expect(scrollTo).toHaveBeenCalledWith({ top: 724, behavior: 'smooth' });

    fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.openButton }));
    const reopenedOverlay = document.querySelector('.mobile-nav-overlay');
    expect(reopenedOverlay).not.toBeNull();
    const reopenedThirdButton = within(reopenedOverlay as HTMLElement).getByRole('button', {
      name: appText.shell.navigation.items.userAnalytics,
    });

    expect(reopenedThirdButton).toHaveClass('active');
    expect(reopenedThirdButton).toHaveAttribute('aria-current', 'page');
  });

  it('routes every public mobile menu voice to the matching section and closes the overlay', async () => {
    setupRoadmapFetch();
    mockMediaMatches({ '(max-width: 767px)': true });

    await renderRoadmapApp(['/dashboard?view=public']);
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
      fireEvent.click(screen.getByRole('button', { name: appText.shell.navigation.openButton }));

      const overlay = document.querySelector('.mobile-nav-overlay');
      expect(overlay).not.toBeNull();

      fireEvent.click(within(overlay as HTMLElement).getByRole('button', { name: label }));
      expect(document.querySelector('.mobile-nav-overlay')).toBeNull();
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();

      for (const forbiddenHeading of forbidden) {
        expect(screen.queryByRole('heading', { name: forbiddenHeading })).not.toBeInTheDocument();
      }
    }
  }, 10000);
});
