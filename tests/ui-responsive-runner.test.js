import { describe, expect, it, vi } from 'vitest';
import { cleanupResponsiveCheck } from '../scripts/ui-responsive/cleanup.mjs';
import { runResponsiveCheck } from '../scripts/ui-responsive/run-responsive-check.mjs';
import { resolveUiResponsiveTarget } from '../scripts/local-runtime-targets.mjs';

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
      assertCleanEnvironment: vi.fn(async () => {
        calls.push('assert-clean');
      }),
      startSession: vi.fn(async () => {
        calls.push('start-session');
        return playwrightSession;
      }),
      resizeViewport: vi.fn(async () => {}),
      captureScreenshot: vi.fn(async () => null),
      collectDiagnostics: vi.fn(async () => {}),
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
      runtimeTarget: resolveUiResponsiveTarget({
        UI_RESPONSIVE_TARGET: 'csharp-dev',
      }),
      breakpoints: [{ label: 'mobile', width: 390, height: 844 }],
      prepareOutputDirectory: vi.fn(),
      ensureLocalAppStack: vi.fn(async () => localStack),
      ensureLocalAdminCredential: vi.fn(async () => false),
      ensureAdminSession: vi.fn(async () => {
        calls.push('ensure-admin');
      }),
      waitForFrontend: vi.fn(async () => {
        calls.push('wait-frontend');
      }),
      createPlaywrightAdapter: vi.fn(() => cli),
      navigateToBase: vi.fn(async () => {
        calls.push('navigate');
      }),
      resizeViewport: vi.fn(async ({ label }) => {
        calls.push(`resize:${label}`);
      }),
      inspectState: vi.fn(async () => ({ selectedWeekend: { cardText: 'A', bannerTitle: 'A' } })),
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
      'ensure-admin',
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

  it('does not require npx preflight checks for the in-process Playwright runner', async () => {
    const createPlaywrightAdapter = vi.fn(() => ({
      assertCleanEnvironment: vi.fn(async () => {}),
      startSession: vi.fn(async () => ({
        stop: vi.fn(async () => []),
      })),
      resizeViewport: vi.fn(async () => {}),
      collectDiagnostics: vi.fn(async () => {}),
    }));

    const result = await runResponsiveCheck({
      baseUrl: 'http://127.0.0.1:5173',
      runtimeTarget: resolveUiResponsiveTarget({
        UI_RESPONSIVE_TARGET: 'csharp-dev',
      }),
      breakpoints: [],
      prepareOutputDirectory: vi.fn(),
      ensureLocalAppStack: vi.fn(async () => ({
        stop: vi.fn(async () => {}),
      })),
      waitForFrontend: vi.fn(async () => {}),
      createPlaywrightAdapter,
      navigateToBase: vi.fn(async () => {}),
      ensureLocalAdminCredential: vi.fn(async () => false),
      ensureAdminSession: vi.fn(async () => {}),
      cleanupResponsiveCheck: vi.fn(async () => []),
      consoleImpl: {
        log: vi.fn(),
        error: vi.fn(),
      },
    });

    expect(createPlaywrightAdapter).toHaveBeenCalledTimes(1);
    expect(result.exitCode).toBe(0);
  });
});
