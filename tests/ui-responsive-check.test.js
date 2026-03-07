import { describe, expect, it, vi } from 'vitest';
import {
  canSelectSprintWeekend,
  canSwitchWeekend,
  cleanupResponsiveCheck,
  createPlaywrightCliAdapter,
  ensureLocalAppStack,
  findStaleResponsiveSessions,
  isAppShellReady,
  validateState,
  waitForAppShell,
} from '../scripts/ui-responsive-check.mjs';

describe('responsive UI local stack bootstrap', () => {
  it('starts backend and frontend when the frontend is initially unreachable and stops them afterwards', async () => {
    let fetchCalls = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      fetchCalls += 1;

      if (fetchCalls === 1) {
        throw new Error('offline');
      }

      return { ok: true };
    });
    const backendKill = vi.fn();
    const frontendKill = vi.fn();
    const spawnImpl = vi
      .fn()
      .mockReturnValueOnce({ killed: false, kill: backendKill })
      .mockReturnValueOnce({ killed: false, kill: frontendKill });

    const stack = await ensureLocalAppStack({
      frontendUrl: 'http://127.0.0.1:5173',
      backendCommand: 'node',
      backendArgs: ['server.js'],
      frontendCommand: 'npm',
      frontendArgs: ['run', 'dev:frontend'],
      fetchImpl,
      spawnImpl,
      sleepImpl: async () => {},
      timeoutMs: 1500,
      pollInterval: 10,
      cwd: '/tmp/fantaf1',
      env: {},
    });

    expect(stack.started).toBe(true);
    expect(spawnImpl).toHaveBeenNthCalledWith(
      1,
      'node',
      ['server.js'],
      expect.objectContaining({ cwd: '/tmp/fantaf1', stdio: 'ignore' }),
    );
    expect(spawnImpl).toHaveBeenNthCalledWith(
      2,
      'npm',
      ['run', 'dev:frontend'],
      expect.objectContaining({ cwd: '/tmp/fantaf1', stdio: 'ignore' }),
    );

    await stack.stop();

    expect(frontendKill).toHaveBeenCalledWith('SIGTERM');
    expect(backendKill).toHaveBeenCalledWith('SIGTERM');
  });

  it('reuses an already reachable frontend without spawning child processes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const spawnImpl = vi.fn();

    const stack = await ensureLocalAppStack({
      frontendUrl: 'http://127.0.0.1:5173',
      fetchImpl,
      spawnImpl,
      sleepImpl: async () => {},
      timeoutMs: 100,
      pollInterval: 10,
      cwd: '/tmp/fantaf1',
      env: {},
    });

    expect(stack.started).toBe(false);
    expect(spawnImpl).not.toHaveBeenCalled();

    await expect(stack.stop()).resolves.toBeUndefined();
  });

  it('skips the weekend-switch scenario when fewer than two calendar cards are available', () => {
    expect(canSwitchWeekend({ selectedWeekend: { calendarCardCount: 0 } })).toBe(false);
    expect(canSwitchWeekend({ selectedWeekend: { calendarCardCount: 1 } })).toBe(false);
    expect(canSwitchWeekend({ selectedWeekend: { calendarCardCount: 2 } })).toBe(true);
  });

  it('skips the sprint scenario when no sprint weekends are available', () => {
    expect(canSelectSprintWeekend({ selectedWeekend: { sprintCardCount: 0 } })).toBe(false);
    expect(canSelectSprintWeekend({ selectedWeekend: { sprintCardCount: 1 } })).toBe(true);
  });
});

describe('responsive UI playwright preflight', () => {
  it('finds stale responsive sessions while ignoring unrelated browsers', () => {
    const output = `### Browsers
- ui-old:
  - status: open
  - browser-type: chrome
- codex-debug-123:
  - status: open
  - browser-type: chrome
- ui-closed:
  - status: closed
  - browser-type: chrome`;

    expect(findStaleResponsiveSessions(output)).toEqual(['ui-old']);
  });

  it('fails fast when stale responsive sessions are already open', () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 0,
      stdout: `### Browsers
- ui-stale:
  - status: open
  - browser-type: chrome`,
      stderr: '',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-current',
      spawnSyncImpl,
    });

    expect(() => adapter.assertCleanEnvironment()).toThrow(/ui-stale/);
    expect(spawnSyncImpl).toHaveBeenCalledTimes(1);
    expect(spawnSyncImpl.mock.calls[0][1]).toContain('list');
    expect(spawnSyncImpl.mock.calls[0][1]).not.toContain('close-all');
    expect(spawnSyncImpl.mock.calls[0][1]).not.toContain('kill-all');
  });
});

describe('responsive UI playwright adapter', () => {
  it('surfaces CLI timeouts with the configured timeout', () => {
    const timeoutError = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: null,
      stdout: '',
      stderr: '',
      error: timeoutError,
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-timeout',
      spawnSyncImpl,
    });

    expect(() => adapter.run(['tab-list'])).toThrow(/scaduto/i);
    expect(spawnSyncImpl).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['playwright-cli', '-s=ui-timeout', 'tab-list']),
      expect.objectContaining({ timeout: 10000 }),
    );
  });

  it('uses the native goto command for navigation resets', () => {
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('goto')) {
        return { status: 0, stdout: '', stderr: '' };
      }

      if (args.includes('tab-list')) {
        return {
          status: 0,
          stdout: '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)',
          stderr: '',
        };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-goto',
      spawnSyncImpl,
    });

    adapter.goto('http://127.0.0.1:5173', {
      timeoutMs: 25,
      pollInterval: 0,
    });

    const gotoCall = spawnSyncImpl.mock.calls.find(([, args]) => args.includes('goto'));
    expect(gotoCall).toBeTruthy();
    expect(gotoCall[1]).toContain('goto');
    expect(gotoCall[1]).toContain('http://127.0.0.1:5173');
    expect(gotoCall[1]).not.toContain('run-code');
  });

  it('collects diagnostic artifacts for a shell timeout', () => {
    const fsImpl = {
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(true),
    };
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('screenshot')) {
        return {
          status: 0,
          stdout: '### Result\n- [Screenshot](.playwright-cli/page-shot.png)',
          stderr: '',
        };
      }

      if (args.includes('tab-list')) {
        return {
          status: 0,
          stdout: '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)',
          stderr: '',
        };
      }

      if (args.includes('console')) {
        return {
          status: 0,
          stdout: '### Result\n- [Console](.playwright-cli/console-debug.log)',
          stderr: '',
        };
      }

      if (args.includes('network')) {
        return {
          status: 0,
          stdout: '### Result\n- [Network](.playwright-cli/network-debug.log)',
          stderr: '',
        };
      }

      if (args.includes('eval')) {
        return {
          status: 0,
          stdout: `### Result
{"href":"http://127.0.0.1:5173/","title":"FantaF1 2026","readyState":"interactive","loadingShell":true,"selectors":{"heroPanel":false,"heroSummaryGrid":false,"calendarPanel":false,"predictionsGrid":false,"appFooter":false,"resultsActions":false,"liveScoreValue":false,"pointsPreviewValue":false}}
### Ran Playwright code`,
          stderr: '',
        };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-diagnostics',
      outputDirectory: '/tmp/ui-responsive-artifacts',
      fsImpl,
      spawnSyncImpl,
    });

    const diagnostics = adapter.collectDiagnostics({
      label: 'app-shell-timeout',
      error: new Error('Shell UI principale non pronta entro il timeout previsto.'),
      remediation: 'Verifica i log copiati e chiudi eventuali sessioni residue.',
    });

    expect(diagnostics.summaryPath).toBe('/tmp/ui-responsive-artifacts/app-shell-timeout-summary.txt');
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/app-shell-timeout-summary.txt',
      expect.stringContaining('Shell UI principale non pronta entro il timeout previsto.'),
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/app-shell-timeout-page-state.json',
      expect.stringContaining('"loadingShell": true'),
      'utf8',
    );
    expect(fsImpl.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/.playwright-cli/page-shot.png'),
      '/tmp/ui-responsive-artifacts/app-shell-timeout-screenshot.png',
    );
    expect(fsImpl.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/.playwright-cli/console-debug.log'),
      '/tmp/ui-responsive-artifacts/app-shell-timeout-console.log',
    );
    expect(fsImpl.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/.playwright-cli/network-debug.log'),
      '/tmp/ui-responsive-artifacts/app-shell-timeout-network.log',
    );
  });
});

describe('responsive UI app shell gating', () => {
  it('treats the minimal shell as ready even before responsive assertions pass', () => {
    const shellState = {
      href: 'http://127.0.0.1:5173/',
      title: 'FantaF1 2026',
      readyState: 'complete',
      loadingShell: false,
      selectors: {
        heroPanel: true,
        heroSummaryGrid: true,
        calendarPanel: true,
        predictionsGrid: true,
        appFooter: true,
        resultsActions: false,
        liveScoreValue: false,
        pointsPreviewValue: false,
      },
    };
    const validationState = {
      mainSections: {
        hero: true,
        summary: true,
        calendar: true,
        predictions: true,
        results: false,
        footer: true,
      },
      nextRace: {
        cardPresent: true,
        badgeText: 'Weekend Standard',
        hasSessions: false,
        rowCount: 0,
        clippedRows: [],
        noteText: '',
        noteFits: true,
      },
      typography: {
        sessionDay: { present: false, fontFamily: '', text: '' },
        sessionDate: { present: false, fontFamily: '', text: '' },
        sessionClock: { present: false, fontFamily: '', text: '' },
        liveScoreValue: { present: false, fontFamily: '', text: '' },
        projectionValue: { present: false, fontFamily: '', text: '' },
      },
      tooltip: {
        wrapperPresent: false,
        disabledWrapperPresent: false,
        present: false,
        visible: false,
        fitsViewport: true,
        text: '',
      },
      history: {
        present: true,
        hasCards: false,
        emptyStateVisible: true,
        actionButtonCount: 0,
        clippedButtons: [],
      },
      selectedWeekend: {
        calendarCardCount: 1,
        sprintCardCount: 0,
        cardText: 'Round 1 Australia',
        bannerTitle: 'Australian Grand Prix 2026',
        firstPredictionValue: '',
        firstPredictionText: '',
        firstResultValue: '',
        firstResultText: '',
      },
      unauthorizedOverflow: [],
    };

    expect(isAppShellReady(shellState)).toBe(true);
    expect(waitForAppShell({
      getPageInfoImpl: () => shellState,
      sleepSyncImpl: vi.fn(),
      timeoutMs: 10,
      pollInterval: 0,
    })).toEqual(shellState);
    expect(validateState(validationState)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Sezioni principali mancanti'),
        'Target tipografico mancante: punti classifica live.',
        'Target tipografico mancante: valore proiezione gara.',
      ]),
    );
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
