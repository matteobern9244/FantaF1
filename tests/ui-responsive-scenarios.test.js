import { describe, expect, it, vi } from 'vitest';
import { buildResponsiveScenarios } from '../scripts/ui-responsive/scenarios.mjs';

describe('responsive UI scenarios', () => {
  it('builds the ordered scenario list with deterministic optional skips', async () => {
    const calls = [];
    const cli = {
      evaluateJson: vi.fn(),
      captureScreenshot: vi.fn().mockReturnValue('/tmp/failure.png'),
    };
    const shared = {
      cli,
      inspectState: vi.fn()
        .mockReturnValueOnce({ selectedWeekend: { cardText: 'A', bannerTitle: 'A' } })
        .mockReturnValueOnce({ selectedWeekend: { cardText: 'A', bannerTitle: 'A' } })
        .mockReturnValueOnce({ selectedWeekend: { cardText: 'A', bannerTitle: 'A' } })
        .mockReturnValueOnce({ selectedWeekend: { cardText: 'B', bannerTitle: 'B' } })
        .mockReturnValueOnce({ selectedWeekend: { cardText: 'Sprint', bannerTitle: 'Sprint' } }),
      validateState: vi.fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['public fail'])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]),
      switchViewMode: vi.fn((mode) => calls.push(`view:${mode}`)),
      scrollAwayFromHeader: vi.fn(() => calls.push('sticky-navigation')),
      switchWeekend: vi.fn(() => calls.push('weekend')),
      selectSprintWeekend: vi.fn(() => calls.push('sprint')),
      openTooltipIfPresent: vi.fn().mockReturnValue(true),
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

    expect(calls).toEqual(['view:public', 'view:admin', 'sticky-navigation', 'weekend', 'sprint']);
    expect(shared.validateState).toHaveBeenCalledTimes(6);
    expect(results[1]).toEqual(expect.objectContaining({
      key: 'public-view',
      failures: ['public fail'],
      screenshotPath: '/tmp/failure.png',
    }));
    expect(results[3]).toEqual(expect.objectContaining({ key: 'sticky-navigation', skipped: false }));
    expect(results[4]).toEqual(expect.objectContaining({ key: 'weekend-switch', skipped: false }));
    expect(results[5]).toEqual(expect.objectContaining({ key: 'sprint-tooltip', skipped: false }));
  });

  it('marks optional scenarios as skipped when prerequisites are missing', async () => {
    const shared = {
      cli: {
        captureScreenshot: vi.fn(),
      },
      inspectState: vi.fn().mockReturnValue({}),
      validateState: vi.fn().mockReturnValue([]),
      switchViewMode: vi.fn(),
      scrollAwayFromHeader: vi.fn(),
      switchWeekend: vi.fn(),
      selectSprintWeekend: vi.fn(),
      openTooltipIfPresent: vi.fn().mockReturnValue(false),
      canSwitchWeekend: vi.fn().mockReturnValue(false),
      canSelectSprintWeekend: vi.fn().mockReturnValue(false),
    };

    const scenarios = buildResponsiveScenarios({ initialState: { selectedWeekend: { cardText: 'A', bannerTitle: 'A' } } });
    const stickyNavigationResult = await scenarios[3].run(shared);
    const weekendResult = await scenarios[4].run(shared);
    const sprintResult = await scenarios[5].run(shared);

    expect(stickyNavigationResult).toEqual(expect.objectContaining({ key: 'sticky-navigation', skipped: false }));
    expect(weekendResult).toEqual(expect.objectContaining({ key: 'weekend-switch', skipped: true }));
    expect(sprintResult).toEqual(expect.objectContaining({ key: 'sprint-tooltip', skipped: true }));
    expect(shared.scrollAwayFromHeader).toHaveBeenCalledTimes(1);
    expect(shared.switchWeekend).not.toHaveBeenCalled();
    expect(shared.selectSprintWeekend).not.toHaveBeenCalled();
  });
});
