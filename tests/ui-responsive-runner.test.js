import { describe, expect, it, vi } from 'vitest';
import { cleanupResponsiveCheck } from '../scripts/ui-responsive/cleanup.mjs';
import { runResponsiveCheck } from '../scripts/ui-responsive/run-responsive-check.mjs';

describe('responsive UI runner', () => {
  it('executes the responsive workflow in order and cleans up at the end', async () => {
    const calls = [];
    const localStack = {
      stop: vi.fn(async () => {
        calls.push('stack-stop');
      }),
    };
    const playwrightSession = {
      stop: vi.fn(async () => {
        calls.push('playwright-stop');
        return [];
      }),
    };
    const cli = {
      assertCleanEnvironment: vi.fn(() => {
        calls.push('assert-clean');
      }),
      startSession: vi.fn(async () => {
        calls.push('start-session');
        return playwrightSession;
      }),
      captureScreenshot: vi.fn().mockReturnValue(null),
      collectDiagnostics: vi.fn(),
    };
    const scenarios = [
      {
        key: 'default',
        run: vi.fn(async () => {
          calls.push('scenario-default');
          return { key: 'default', failures: [] };
        }),
      },
      {
        key: 'public-view',
        run: vi.fn(async () => {
          calls.push('scenario-public');
          return { key: 'public-view', failures: ['overflow'], screenshotPath: '/tmp/public.png' };
        }),
      },
    ];

    const result = await runResponsiveCheck({
      baseUrl: 'http://127.0.0.1:5173',
      breakpoints: [{ label: 'mobile', width: 390, height: 844 }],
      ensureNpx: vi.fn(),
      prepareOutputDirectory: vi.fn(),
      ensureLocalAppStack: vi.fn(async () => localStack),
      waitForFrontend: vi.fn(async () => {
        calls.push('wait-frontend');
      }),
      createPlaywrightCliAdapter: vi.fn(() => cli),
      navigateToBase: vi.fn(() => {
        calls.push('navigate');
      }),
      resizeViewport: vi.fn(({ label }) => {
        calls.push(`resize:${label}`);
      }),
      inspectState: vi.fn(() => ({ selectedWeekend: { cardText: 'A', bannerTitle: 'A' } })),
      buildResponsiveScenarios: vi.fn(() => scenarios),
      cleanupResponsiveCheck: vi.fn(async ({ playwrightSession: session, localStack: stack }) => {
        await session.stop();
        await stack.stop();
        return [];
      }),
      consoleImpl: {
        log: vi.fn(),
        error: vi.fn(),
      },
    });

    expect(result.failures).toEqual([
      expect.objectContaining({
        viewport: { label: 'mobile', width: 390, height: 844 },
        state: 'public-view',
        failures: ['overflow'],
        screenshotPath: '/tmp/public.png',
      }),
    ]);
    expect(result.cleanupIssues).toEqual([]);
    expect(calls).toEqual([
      'wait-frontend',
      'assert-clean',
      'start-session',
      'navigate',
      'resize:mobile',
      'navigate',
      'scenario-default',
      'scenario-public',
      'playwright-stop',
      'stack-stop',
    ]);
  });
});

describe('responsive UI teardown', () => {
  it('stops the playwright session before stopping the local stack and reports issues', async () => {
    const order = [];
    const consoleImpl = {
      error: vi.fn(),
    };
    const issues = await cleanupResponsiveCheck({
      playwrightSession: {
        stop: vi.fn(async () => {
          order.push('playwright');
          return ['Sessione Playwright orfana ancora aperta: ui-stale'];
        }),
      },
      localStack: {
        stop: vi.fn(async () => {
          order.push('stack');
        }),
      },
      consoleImpl,
    });

    expect(order).toEqual(['playwright', 'stack']);
    expect(issues).toEqual(['Sessione Playwright orfana ancora aperta: ui-stale']);
    expect(consoleImpl.error).toHaveBeenCalledWith(
      '[ui-responsive] Sessione Playwright orfana ancora aperta: ui-stale',
    );
  });
});
