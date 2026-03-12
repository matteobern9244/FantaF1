import { describe, expect, it, vi } from 'vitest';
import {
  createPlaywrightCliAdapter,
  describeCommandError,
  extractProcessOutput,
  extractResultBlock,
  findStaleResponsiveSessions,
  parsePlaywrightSessions,
} from '../scripts/ui-responsive/playwright-cli.mjs';

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

  it('fails when the Playwright output does not expose a result block', () => {
    expect(() => extractResultBlock('plain output without result markers')).toThrow(
      /Impossibile leggere il risultato da Playwright CLI/i,
    );
  });

  it('treats missing process streams as empty output', () => {
    expect(extractProcessOutput({ stdout: null, stderr: undefined })).toBe('');
  });

  it('tolerates undefined session listings', () => {
    expect(parsePlaywrightSessions(undefined)).toEqual([]);
  });

  it('prefers the string cause when the generic command error would hide the useful detail', () => {
    const error = new Error('Comando Playwright fallito: close');
    error.cause = 'already closed';

    expect(describeCommandError(error)).toBe('already closed');
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

  it('reports non-zero CLI exit codes through safeRun without throwing', () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'manual failure',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-safe-run-status',
      spawnSyncImpl,
    });

    expect(adapter.safeRun(['close'])).toEqual({
      ok: false,
      error: expect.objectContaining({
        message: 'manual failure',
      }),
      output: 'manual failure',
      status: 1,
    });
  });

  it('falls back to the generic command message when the CLI fails without output details', () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 1,
      stdout: '',
      stderr: '',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-safe-run-generic-status',
      spawnSyncImpl,
    });

    expect(adapter.safeRun(['close'])).toEqual({
      ok: false,
      error: expect.objectContaining({
        message: 'Comando Playwright fallito: close',
      }),
      output: '',
      status: 1,
    });
  });

  it('throws on non-zero CLI exit codes when allowFailure is not enabled', () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'manual failure',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-run-status',
      spawnSyncImpl,
    });

    expect(() => adapter.run(['close'])).toThrow(/manual failure/i);
  });

  it('handles empty command arrays without crashing the timeout retry classifier', () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-empty-command',
      spawnSyncImpl,
    });

    expect(adapter.safeRun([])).toEqual({
      ok: true,
      output: '',
      status: 0,
    });
  });

  it('retries a slow close command during teardown before reporting success', async () => {
    const timeoutError = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
    const child = { exitCode: null, signalCode: null, kill: vi.fn() };
    const spawnImpl = vi.fn().mockReturnValue(child);
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('tab-list')) {
        return {
          status: 0,
          stdout: '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)',
          stderr: '',
        };
      }

      if (args.includes('close')) {
        return spawnSyncImpl.mock.calls.filter(([, currentArgs]) => currentArgs.includes('close')).length === 1
          ? {
              status: null,
              stdout: '',
              stderr: '',
              error: timeoutError,
            }
          : {
              status: 0,
              stdout: '',
              stderr: '',
            };
      }

      if (args.includes('list')) {
        return { status: 0, stdout: '### Browsers\n  (no browsers)\n', stderr: '' };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-slow-close',
      spawnImpl,
      spawnSyncImpl,
      sleepImpl: async () => {},
      sleepSyncImpl: () => {},
    });

    const session = await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
      pollInterval: 0,
    });
    const issues = await session.stop();
    const closeCalls = spawnSyncImpl.mock.calls.filter(([, args]) => args.includes('close'));

    expect(issues).toEqual([]);
    expect(closeCalls).toHaveLength(2);
    expect(closeCalls[0][2]).toEqual(expect.objectContaining({ timeout: 30000 }));
    expect(closeCalls[1][2]).toEqual(expect.objectContaining({ timeout: 90000 }));
  });

  it('does not report teardown issues when close times out but the session is no longer listed', async () => {
    const timeoutError = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
    const child = { exitCode: null, signalCode: null, kill: vi.fn() };
    const spawnImpl = vi.fn().mockReturnValue(child);
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('tab-list')) {
        return {
          status: 0,
          stdout: '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)',
          stderr: '',
        };
      }

      if (args.includes('close')) {
        return {
          status: null,
          stdout: '',
          stderr: '',
          error: timeoutError,
        };
      }

      if (args.includes('list')) {
        return { status: 0, stdout: '### Browsers\n  (no browsers)\n', stderr: '' };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-close-timeout-clean',
      spawnImpl,
      spawnSyncImpl,
      sleepImpl: async () => {},
      sleepSyncImpl: () => {},
    });

    const session = await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
      pollInterval: 0,
    });

    await expect(session.stop()).resolves.toEqual([]);
  });

  it('reports teardown failures when close times out and the session remains open', async () => {
    const timeoutError = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
    const child = { exitCode: null, signalCode: null, kill: vi.fn() };
    const spawnImpl = vi.fn().mockReturnValue(child);
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('tab-list')) {
        return {
          status: 0,
          stdout: '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)',
          stderr: '',
        };
      }

      if (args.includes('close')) {
        return {
          status: null,
          stdout: '',
          stderr: '',
          error: timeoutError,
        };
      }

      if (args.includes('list')) {
        return {
          status: 0,
          stdout: `### Browsers
- ui-close-timeout-stale:
  - status: open
  - browser-type: chrome`,
          stderr: '',
        };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-close-timeout-stale',
      spawnImpl,
      spawnSyncImpl,
      sleepImpl: async () => {},
      sleepSyncImpl: () => {},
    });

    const session = await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
      pollInterval: 0,
    });

    await expect(session.stop()).resolves.toEqual([
      'Chiusura sessione Playwright fallita: Comando Playwright scaduto dopo 30000ms: close',
      expect.stringContaining('Sessione Playwright orfana ancora aperta: ui-close-timeout-stale.'),
    ]);
  });

  it('ignores the close command when Playwright reports that the session is already closed', async () => {
    const child = { exitCode: null, signalCode: null, kill: vi.fn() };
    const spawnImpl = vi.fn().mockReturnValue(child);
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('tab-list')) {
        return {
          status: 0,
          stdout: '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)',
          stderr: '',
        };
      }

      if (args.includes('close')) {
        return {
          status: 1,
          stdout: '',
          stderr: 'not open, please run open first',
        };
      }

      if (args.includes('list')) {
        return { status: 0, stdout: '### Browsers\n  (no browsers)\n', stderr: '' };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-already-closed',
      spawnImpl,
      spawnSyncImpl,
      sleepImpl: async () => {},
      sleepSyncImpl: () => {},
    });

    const session = await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
      pollInterval: 0,
    });

    await expect(session.stop()).resolves.toEqual([]);
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

  it('fails when Playwright returns invalid JSON from eval', () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 0,
      stdout: '### Result\nnot-json\n### Ran Playwright code',
      stderr: '',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-invalid-json',
      spawnSyncImpl,
    });

    expect(() => adapter.evaluateJson('() => ({})')).toThrow(/parse del risultato JSON/i);
  });

  it('returns the parsed page info payload', () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 0,
      stdout: '### Result\n{"href":"http://127.0.0.1:5173/","readyState":"complete"}\n### Ran Playwright code',
      stderr: '',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-page-info',
      spawnSyncImpl,
    });

    expect(adapter.getPageInfo()).toEqual({
      href: 'http://127.0.0.1:5173/',
      readyState: 'complete',
    });
  });

  it('waits for the current tab url to appear before considering the session ready', async () => {
    let tabListCalls = 0;
    const child = { exitCode: null, signalCode: null, kill: vi.fn() };
    const spawnImpl = vi.fn().mockReturnValue(child);
    const sleepSyncImpl = vi.fn();
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('tab-list')) {
        tabListCalls += 1;

        return tabListCalls === 1
          ? {
              status: 0,
              stdout: '### Result\n',
              stderr: '',
            }
          : {
              status: 0,
              stdout: '### Result\n- 0: (current) [FantaF1 2026](http://127.0.0.1:5173/)',
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
      sessionId: 'ui-delayed-tab-ready',
      spawnImpl,
      spawnSyncImpl,
      sleepImpl: async () => {},
      sleepSyncImpl,
    });

    const session = await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
      pollInterval: 0,
    });

    expect(sleepSyncImpl).toHaveBeenCalled();
    await expect(session.stop()).resolves.toEqual([]);
  });

  it('returns null when the screenshot artifact link is missing on disk', () => {
    const fsImpl = {
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(false),
    };
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('screenshot')) {
        return {
          status: 0,
          stdout: '### Result\n- [Screenshot](.playwright-cli/missing-shot.png)',
          stderr: '',
        };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-missing-shot',
      fsImpl,
      spawnSyncImpl,
    });

    expect(adapter.captureScreenshot('missing-shot')).toBeNull();
    expect(fsImpl.copyFileSync).not.toHaveBeenCalled();
  });

  it('uses a .txt extension fallback when the linked artifact has no extension', () => {
    const fsImpl = {
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(true),
    };
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('screenshot')) {
        return {
          status: 0,
          stdout: '### Result\n- [Screenshot](.playwright-cli/page-shot)',
          stderr: '',
        };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-shot-no-extension',
      outputDirectory: '/tmp/ui-responsive-artifacts',
      fsImpl,
      spawnSyncImpl,
    });

    expect(adapter.captureScreenshot('page-shot')).toBe('/tmp/ui-responsive-artifacts/page-shot-screenshot.txt');
    expect(fsImpl.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/.playwright-cli/page-shot'),
      '/tmp/ui-responsive-artifacts/page-shot-screenshot.txt',
    );
  });

  it('stops the spawned Playwright child when the session never becomes ready', async () => {
    const child = { exitCode: null, signalCode: null, kill: vi.fn() };
    const spawnImpl = vi.fn().mockReturnValue(child);
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 0,
      stdout: '### Result\n',
      stderr: '',
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-start-failure',
      spawnImpl,
      spawnSyncImpl,
      sleepImpl: async () => {},
      sleepSyncImpl: () => {},
    });

    await expect(
      adapter.startSession({
        url: 'http://127.0.0.1:5173',
        timeoutMs: 0,
        pollInterval: 0,
      }),
    ).rejects.toThrow(/Sessione Playwright non pronta/i);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('fails the goto helper when Playwright never reaches the requested url', () => {
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('goto')) {
        return { status: 0, stdout: '', stderr: '' };
      }

      return {
        status: 0,
        stdout: '### Result\n- 0: (current) [about:blank](about:blank)',
        stderr: '',
      };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-goto-failure',
      spawnSyncImpl,
      sleepSyncImpl: () => {},
    });

    expect(() => adapter.goto('http://127.0.0.1:5173', {
      timeoutMs: 0,
      pollInterval: 0,
    })).toThrow(/Navigazione Playwright non riuscita verso http:\/\/127\.0\.0\.1:5173/i);
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

  it('collects text fallbacks when diagnostic artifacts cannot be copied and preserves the cause details', () => {
    const fsImpl = {
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(false),
    };
    const spawnSyncImpl = vi.fn().mockImplementation((_command, args) => {
      if (args.includes('screenshot')) {
        return {
          status: 1,
          stdout: '',
          stderr: 'screenshot failure',
        };
      }

      if (args.includes('tab-list')) {
        return {
          status: 1,
          stdout: '',
          stderr: 'tab list failure',
        };
      }

      if (args.includes('eval')) {
        return {
          status: 0,
          stdout: '### Result\nnot-json\n### Ran Playwright code',
          stderr: '',
        };
      }

      if (args.includes('console')) {
        return {
          status: 0,
          stdout: '### Result\nno linked console artifact',
          stderr: '',
        };
      }

      if (args.includes('network')) {
        return {
          status: 0,
          stdout: '### Result\nno linked network artifact',
          stderr: '',
        };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-diagnostics-fallbacks',
      outputDirectory: '/tmp/ui-responsive-artifacts',
      fsImpl,
      spawnSyncImpl,
    });
    const error = new Error('Shell UI principale non pronta entro il timeout previsto.');
    error.cause = { reason: 'slow teardown' };

    const diagnostics = adapter.collectDiagnostics({
      label: 'fallback-artifacts',
      error,
    });

    expect(diagnostics.screenshotPath).toBeNull();
    expect(diagnostics.consolePath).toBeNull();
    expect(diagnostics.networkPath).toBeNull();
    expect(fsImpl.copyFileSync).not.toHaveBeenCalled();
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/fallback-artifacts-tab-list.txt',
      expect.stringContaining('Impossibile leggere i tab Playwright.'),
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/fallback-artifacts-page-state.txt',
      expect.stringContaining('Impossibile leggere lo stato pagina.'),
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/fallback-artifacts-console.txt',
      '### Result\nno linked console artifact',
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/fallback-artifacts-network.txt',
      '### Result\nno linked network artifact',
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/fallback-artifacts-summary.txt',
      expect.stringContaining('cause: {\n  "reason": "slow teardown"\n}'),
      'utf8',
    );
  });

  it('writes console and network error details when those diagnostic commands fail and keeps string causes readable', () => {
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

      if (args.includes('eval')) {
        return {
          status: 0,
          stdout: '### Result\n{"href":"http://127.0.0.1:5173/","loadingShell":false}\n### Ran Playwright code',
          stderr: '',
        };
      }

      if (args.includes('console')) {
        return {
          status: 1,
          stdout: '',
          stderr: 'console failure',
        };
      }

      if (args.includes('network')) {
        return {
          status: 1,
          stdout: '',
          stderr: 'network failure',
        };
      }

      return { status: 0, stdout: '', stderr: '' };
    });
    const adapter = createPlaywrightCliAdapter({
      sessionId: 'ui-diagnostics-errors',
      outputDirectory: '/tmp/ui-responsive-artifacts',
      fsImpl,
      spawnSyncImpl,
    });
    const error = new Error('Teardown incompleto.');
    error.cause = 'close command timed out';

    adapter.collectDiagnostics({
      label: 'diagnostic-errors',
      error,
    });

    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/diagnostic-errors-console.txt',
      'console failure',
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/diagnostic-errors-network.txt',
      'network failure',
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive-artifacts/diagnostic-errors-summary.txt',
      expect.stringContaining('cause: close command timed out'),
      'utf8',
    );
  });
});
