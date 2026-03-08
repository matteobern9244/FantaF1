import { describe, expect, it, vi } from 'vitest';
import { createPlaywrightCliAdapter, findStaleResponsiveSessions } from '../scripts/ui-responsive/playwright-cli.mjs';

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
    expect(spawnSyncImpl.mock.calls[0][2]).toEqual(expect.objectContaining({ timeout: 30000 }));
  });

  it('retries a slow Playwright list command before failing the preflight', () => {
    const timeoutError = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
    const spawnSyncImpl = vi
      .fn()
      .mockReturnValueOnce({
        status: null,
        stdout: '',
        stderr: '',
        error: timeoutError,
      })
      .mockReturnValueOnce({
        status: 0,
        stdout: '### Browsers\n  (no browsers)\n',
        stderr: '',
      });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-current',
      spawnSyncImpl,
    });

    expect(() => adapter.assertCleanEnvironment()).not.toThrow();
    expect(spawnSyncImpl).toHaveBeenCalledTimes(2);
    expect(spawnSyncImpl.mock.calls[0][2]).toEqual(expect.objectContaining({ timeout: 30000 }));
    expect(spawnSyncImpl.mock.calls[1][2]).toEqual(expect.objectContaining({ timeout: 90000 }));
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
      expect.objectContaining({ timeout: 30000 }),
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

  it('forces a goto when the opened browser session starts on about:blank', async () => {
    let navigated = false;
    const spawnImpl = vi.fn().mockReturnValue({ killed: false, kill: vi.fn() });
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('goto')) {
        navigated = true;
        return { status: 0, stdout: '', stderr: '' };
      }

      if (args.includes('tab-list')) {
        return {
          status: 0,
          stdout: navigated
            ? '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)'
            : '### Result\n- 0: (current) [about:blank](about:blank)',
          stderr: '',
        };
      }

      if (args.includes('close')) {
        return { status: 0, stdout: '', stderr: '' };
      }

      if (args.includes('list')) {
        return { status: 0, stdout: '### Browsers\n  (no browsers)\n', stderr: '' };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-about-blank',
      spawnImpl,
      spawnSyncImpl,
      sleepImpl: async () => {},
      sleepSyncImpl: () => {},
    });

    await expect(
      adapter.startSession({
        url: 'http://127.0.0.1:5173',
        timeoutMs: 25,
        pollInterval: 0,
      }),
    ).resolves.toEqual(expect.objectContaining({ sessionId: 'ui-about-blank' }));

    const gotoCall = spawnSyncImpl.mock.calls.find(([, args]) => args.includes('goto'));
    expect(gotoCall).toBeTruthy();
    expect(gotoCall[1]).toContain('http://127.0.0.1:5173');
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
