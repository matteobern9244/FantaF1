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
      runtimeTarget: resolveUiResponsiveTarget({
        UI_RESPONSIVE_TARGET: 'node-dev',
      }),
      breakpoints: [{ label: 'mobile', width: 390, height: 844 }],
      ensureNpx: vi.fn(),
      prepareOutputDirectory: vi.fn(),
      ensureLocalAppStack: vi.fn(async () => localStack),
      ensureLocalAdminCredential: vi.fn(async () => false),
      ensureAdminSession: vi.fn(async () => {
        calls.push('ensure-admin');
      }),
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

  it('passes the explicit local runtime target to the stack bootstrapper', async () => {
    const ensureLocalAppStack = vi.fn(async () => ({
      stop: vi.fn(async () => {}),
    }));

    await runResponsiveCheck({
      baseUrl: 'http://127.0.0.1:3003',
      runtimeTarget: resolveUiResponsiveTarget({
        UI_RESPONSIVE_TARGET: 'csharp-staging-local',
      }),
      breakpoints: [],
      ensureNpx: vi.fn(),
      prepareOutputDirectory: vi.fn(),
      ensureLocalAppStack,
      waitForFrontend: vi.fn(async () => {}),
      createPlaywrightCliAdapter: vi.fn(() => ({
        assertCleanEnvironment: vi.fn(),
        startSession: vi.fn(async () => ({
          stop: vi.fn(async () => []),
        })),
        collectDiagnostics: vi.fn(),
      })),
      cleanupResponsiveCheck: vi.fn(async () => []),
      ensureAdminSession: vi.fn(async () => {}),
      consoleImpl: {
        log: vi.fn(),
        error: vi.fn(),
      },
    });

    expect(ensureLocalAppStack).toHaveBeenCalledWith({
      targetConfig: expect.objectContaining({
        name: 'csharp-staging-local',
        baseUrl: 'http://127.0.0.1:3003',
        expectedDatabaseTarget: 'fantaf1_porting',
      }),
    });
  });

  it('authenticates the responsive session when the target requires admin access', async () => {
    const ensureAdminSession = vi.fn(async () => {});

    await runResponsiveCheck({
      baseUrl: 'http://127.0.0.1:3003',
      runtimeTarget: resolveUiResponsiveTarget({
        UI_RESPONSIVE_TARGET: 'csharp-staging-local',
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/fantaf1_dev?retryWrites=true&w=majority',
      }),
      breakpoints: [],
      ensureNpx: vi.fn(),
      prepareOutputDirectory: vi.fn(),
      ensureLocalAppStack: vi.fn(async () => ({
        stop: vi.fn(async () => {}),
      })),
      ensureLocalAdminCredential: vi.fn(async () => true),
      waitForFrontend: vi.fn(async () => {}),
      createPlaywrightCliAdapter: vi.fn(() => ({
        assertCleanEnvironment: vi.fn(),
        startSession: vi.fn(async () => ({
          stop: vi.fn(async () => []),
        })),
        collectDiagnostics: vi.fn(),
      })),
      ensureAdminSession,
      cleanupResponsiveCheck: vi.fn(async () => []),
      consoleImpl: {
        log: vi.fn(),
        error: vi.fn(),
      },
    });

    expect(ensureAdminSession).toHaveBeenCalledWith(expect.objectContaining({
      runtimeTarget: expect.objectContaining({
        name: 'csharp-staging-local',
      }),
      targetUrl: 'http://127.0.0.1:3003',
    }));
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
