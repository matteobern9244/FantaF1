import { describe, expect, it, vi } from 'vitest';
import { buildDashboardAdminUrl, buildResponsiveScenarios, switchViewMode } from '../scripts/ui-responsive/scenarios.mjs';

describe('responsive UI scenarios', () => {
  it('builds the ordered scenario list and executes all mandatory scenarios deterministically', async () => {
    const calls = [];
    const cli = {
      evaluateJson: vi.fn(async () => ({})),
      goto: vi.fn(async () => {}),
      getPageInfo: vi.fn(async () => ({
        loadingShell: false,
        selectors: {
          heroPanel: true,
          heroSummaryGrid: true,
          appFooter: true,
          sectionNav: true,
          calendarPanel: true,
        },
      })),
      captureScreenshot: vi.fn(async () => '/tmp/failure.png'),
    };
    const shared = {
      cli,
      inspectState: vi.fn()
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { cardText: 'A', bannerTitle: 'A', calendarCardCount: 22, sprintCardCount: 6 } })
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { cardText: 'A', bannerTitle: 'A', calendarCardCount: 22, sprintCardCount: 6 } })
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { cardText: 'A', bannerTitle: 'A', calendarCardCount: 22, sprintCardCount: 6 } })
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { cardText: 'A', bannerTitle: 'A', calendarCardCount: 22, sprintCardCount: 6 } })
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { cardText: 'B', bannerTitle: 'B', calendarCardCount: 22, sprintCardCount: 6 } })
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { cardText: 'Sprint', bannerTitle: 'Sprint', calendarCardCount: 22, sprintCardCount: 6 } })
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { cardText: 'Sprint', bannerTitle: 'Sprint', calendarCardCount: 22, sprintCardCount: 6 } })
        .mockResolvedValue({ routePath: '/dashboard', selectedWeekend: { cardText: 'Sprint', bannerTitle: 'Sprint', calendarCardCount: 22, sprintCardCount: 6 } }),
      validateState: vi.fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['public fail'])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]),
      switchViewMode: vi.fn(async (mode) => calls.push(`view:${mode}`)),
      scrollAwayFromHeader: vi.fn(async () => calls.push('sticky-navigation')),
      switchWeekend: vi.fn(async () => calls.push('weekend')),
      selectSprintWeekend: vi.fn(async () => calls.push('sprint')),
      openTooltipIfPresent: vi.fn(async () => true),
      canSwitchWeekend: vi.fn().mockReturnValue(true),
      canSelectSprintWeekend: vi.fn().mockReturnValue(true),
    };

    const scenarios = buildResponsiveScenarios({ initialState: { selectedWeekend: { cardText: 'A', bannerTitle: 'A' } } });

    expect(scenarios.map((scenario) => scenario.key)).toEqual([
      'default',
      'public-view',
      'admin-return',
      'sticky-navigation',
      'weekend-switch',
      'sprint-tooltip',
    ]);

    const results = [];
    for (const scenario of scenarios) {
      results.push(await scenario.run(shared));
    }

    expect(calls).toEqual([
      'view:public',
      'view:admin',
      'sticky-navigation',
      'view:admin',
      'weekend',
      'view:admin',
      'sprint',
    ]);
    expect(cli.goto).toHaveBeenNthCalledWith(1, buildDashboardAdminUrl());
    expect(cli.goto).toHaveBeenNthCalledWith(2, buildDashboardAdminUrl());
    expect(shared.validateState).toHaveBeenCalledTimes(6);
    expect(results[1]).toEqual(expect.objectContaining({
      key: 'public-view',
      failures: ['public fail'],
      screenshotPath: '/tmp/failure.png',
    }));
    expect(results[3]).toEqual(expect.objectContaining({ key: 'sticky-navigation' }));
    expect(results[4]).toEqual(expect.objectContaining({ key: 'weekend-switch' }));
    expect(results[5]).toEqual(expect.objectContaining({ key: 'sprint-tooltip' }));
  }, 40000);

  it('waits for the app shell after switching view modes before validating public and admin return scenarios', async () => {
    const cli = {
      getPageInfo: vi.fn(async () => ({
        loadingShell: false,
        selectors: {
          heroPanel: true,
          heroSummaryGrid: true,
          appFooter: true,
          sectionNav: true,
          calendarPanel: true,
        },
      })),
      captureScreenshot: vi.fn(async () => null),
    };
    const shared = {
      cli,
      inspectState: vi.fn()
        .mockResolvedValueOnce({ routePath: '/dashboard', mainSections: { hero: true, summary: true, calendar: true, footer: true } })
        .mockResolvedValueOnce({ routePath: '/dashboard', mainSections: { hero: true, summary: true, calendar: true, footer: true } }),
      validateState: vi.fn().mockReturnValue([]),
      switchViewMode: vi.fn(async () => {}),
      scrollAwayFromHeader: vi.fn(),
      switchWeekend: vi.fn(),
      selectSprintWeekend: vi.fn(),
      openTooltipIfPresent: vi.fn(async () => false),
      canSwitchWeekend: vi.fn().mockReturnValue(false),
      canSelectSprintWeekend: vi.fn().mockReturnValue(false),
    };

    const scenarios = buildResponsiveScenarios({ initialState: { selectedWeekend: { cardText: 'A', bannerTitle: 'A' } } });

    await scenarios[1].run(shared);
    await scenarios[2].run(shared);

    expect(cli.getPageInfo).toHaveBeenCalledTimes(2);
  });

  it('fails the weekend-switch scenario when the dashboard calendar has no alternative weekends', async () => {
    const shared = {
      cli: {
        goto: vi.fn(async () => {}),
        getPageInfo: vi.fn(async () => ({
          loadingShell: false,
          selectors: {
            heroPanel: true,
            heroSummaryGrid: true,
            appFooter: true,
          sectionNav: true,
          calendarPanel: true,
          },
        })),
        captureScreenshot: vi.fn(async () => null),
      },
      inspectState: vi.fn().mockResolvedValue({ routePath: '/dashboard', selectedWeekend: { calendarCardCount: 1 } }),
      validateState: vi.fn().mockReturnValue([]),
      switchViewMode: vi.fn(),
      scrollAwayFromHeader: vi.fn(),
      switchWeekend: vi.fn(),
      selectSprintWeekend: vi.fn(),
      openTooltipIfPresent: vi.fn(async () => false),
      canSwitchWeekend: vi.fn().mockReturnValue(false),
      canSelectSprintWeekend: vi.fn().mockReturnValue(false),
    };

    const scenarios = buildResponsiveScenarios({ initialState: { selectedWeekend: { cardText: 'A', bannerTitle: 'A' } } });
    await expect(scenarios[4].run(shared)).rejects.toThrow(/weekend-switch non eseguibile/i);
    expect(shared.switchWeekend).not.toHaveBeenCalled();
  });

  it('forces the sprint scenario back to the dashboard instead of skipping when the current route drifted', async () => {
    const shared = {
      cli: {
        goto: vi.fn(async () => {}),
        getPageInfo: vi.fn(async () => ({
          loadingShell: false,
          selectors: {
            heroPanel: true,
            heroSummaryGrid: true,
            appFooter: true,
          sectionNav: true,
          calendarPanel: true,
          },
        })),
        captureScreenshot: vi.fn(async () => null),
      },
      inspectState: vi.fn()
        .mockResolvedValueOnce({ routePath: '/dashboard', selectedWeekend: { sprintCardCount: 2, calendarCardCount: 22, cardText: 'Sprint', bannerTitle: 'Sprint' } })
        .mockResolvedValueOnce({ routePath: '/dashboard', nextRace: { badgeText: 'Sprint' }, tooltip: { wrapperPresent: true, present: true, visible: true, fitsViewport: true } })
        .mockResolvedValue({ routePath: '/dashboard', selectedWeekend: { sprintCardCount: 2, calendarCardCount: 22, cardText: 'Sprint', bannerTitle: 'Sprint' } }),
      validateState: vi.fn().mockReturnValue([]),
      switchViewMode: vi.fn(),
      scrollAwayFromHeader: vi.fn(),
      switchWeekend: vi.fn(),
      selectSprintWeekend: vi.fn(),
      openTooltipIfPresent: vi.fn(async () => false),
      canSwitchWeekend: vi.fn().mockReturnValue(false),
      canSelectSprintWeekend: vi.fn().mockImplementation((state) => state?.routePath === '/dashboard'),
    };

    const scenarios = buildResponsiveScenarios({ initialState: { routePath: '/dashboard', selectedWeekend: { sprintCardCount: 2 } } });
    const sprintResult = await scenarios[5].run(shared);

    expect(shared.cli.goto).toHaveBeenCalledWith(buildDashboardAdminUrl());
    expect(shared.selectSprintWeekend).toHaveBeenCalledTimes(1);
    expect(sprintResult).toEqual(expect.objectContaining({ key: 'sprint-tooltip', failures: [] }));
  }, 40000);

  it('uses an extended Playwright eval timeout when toggling the view mode', async () => {
    const evaluateJsonImpl = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ clicked: true })
      .mockResolvedValueOnce(true);

    await switchViewMode('public', {
      evaluateJsonImpl,
      sleepImpl: vi.fn(async () => {}),
    });

    expect(evaluateJsonImpl).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("document.querySelectorAll('.view-mode-toggle button[aria-pressed]')"),
      expect.objectContaining({ timeoutMs: 90000 }),
    );
    expect(evaluateJsonImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('const matcher = "public"'),
      expect.objectContaining({ timeoutMs: 90000 }),
    );
    expect(evaluateJsonImpl).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("document.querySelectorAll('.view-mode-toggle button[aria-pressed]')"),
      expect.objectContaining({ timeoutMs: 90000 }),
    );
  });

  it('does not click the toggle when the requested view mode is already active', async () => {
    const evaluateJsonImpl = vi
      .fn()
      .mockResolvedValueOnce(true);

    await switchViewMode('admin', {
      evaluateJsonImpl,
      sleepImpl: vi.fn(async () => {}),
    });

    expect(evaluateJsonImpl).toHaveBeenCalledTimes(1);
    expect(evaluateJsonImpl).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("document.querySelectorAll('.view-mode-toggle button[aria-pressed]')"),
      expect.objectContaining({ timeoutMs: 90000 }),
    );
  });

  it('falls back to direct navigation when the toggle does not converge to the requested view', async () => {
    const gotoImpl = vi.fn(async () => {});
    const evaluateJsonImpl = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({ clicked: false })
      .mockResolvedValueOnce({ opened: false })
      .mockResolvedValueOnce('http://127.0.0.1:5173/dashboard?view=admin#calendar-section')
      .mockResolvedValueOnce(true);

    await switchViewMode('public', {
      evaluateJsonImpl,
      gotoImpl,
      sleepImpl: vi.fn(async () => {}),
    });

    expect(gotoImpl).toHaveBeenCalledWith('http://127.0.0.1:5173/dashboard?view=public#calendar-section');
  });
});
