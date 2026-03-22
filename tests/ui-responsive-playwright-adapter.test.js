import { describe, expect, it, vi } from 'vitest';
import {
  createPageFunction,
  createPlaywrightAdapter,
  sanitizeName,
  urlsMatch,
} from '../scripts/ui-responsive/playwright-adapter.mjs';

function createPageStub({
  currentUrl = 'http://127.0.0.1:5173/',
  pageInfo = {
    href: 'http://127.0.0.1:5173/',
    title: 'FantaF1 2026',
    readyState: 'complete',
    loadingShell: false,
    selectors: {
      heroPanel: true,
      heroSummaryGrid: true,
      calendarPanel: true,
      appFooter: true,
      liveScoreValue: true,
      sectionNav: true,
    },
  },
  freezeUrl = false,
  failWaitForUrl = false,
} = {}) {
  const listeners = new Map();
  let url = currentUrl;

  return {
    close: vi.fn(async () => {}),
    evaluate: vi.fn(async (pageFunction) => {
      const pageFunctionSource = String(pageFunction);

      if (pageFunctionSource.includes('loadingShell') || pageFunctionSource.includes('heroPanel')) {
        return pageInfo;
      }

      if (pageFunctionSource.includes('window.location.href')) {
        return url;
      }

      return pageFunction();
    }),
    goto: vi.fn(async (targetUrl) => {
      if (!freezeUrl) {
        url = targetUrl;
      }
      return { ok: () => true };
    }),
    on: vi.fn((event, handler) => {
      listeners.set(event, handler);
    }),
    screenshot: vi.fn(async ({ path }) => path),
    setDefaultTimeout: vi.fn(),
    setViewportSize: vi.fn(async () => {}),
    url: vi.fn(() => url),
    waitForFunction: vi.fn(async (predicate, payload) => {
      if (failWaitForUrl) {
        throw new Error('timeout');
      }

      const originalWindow = globalThis.window;
      globalThis.window = { location: { href: url } };
      try {
        return predicate(payload);
      } finally {
        globalThis.window = originalWindow;
      }
    }),
    __emit: (event, payload) => listeners.get(event)?.(payload),
    __setUrl: (nextUrl) => {
      url = nextUrl;
    },
    __getPageInfo: () => pageInfo,
  };
}

describe('responsive UI playwright adapter', () => {
  it('sanitizes artifact names and accepts urls with extra query parameters', () => {
    expect(sanitizeName('Fatal Screenshot')).toBe('fatal-screenshot');
    expect(
      urlsMatch(
        'http://127.0.0.1:5173/dashboard?view=admin&meeting=1281#calendar-section',
        'http://127.0.0.1:5173/dashboard?view=admin#calendar-section',
      ),
    ).toBe(true);
  });

  it('builds executable page functions from expressions', () => {
    const pageFunction = createPageFunction('() => ({ ok: true })');
    expect(pageFunction()).toEqual({ ok: true });
    expect(() => createPageFunction('({ nope: true })')).toThrow(/Espressione Playwright non valida/i);
  });

  it('starts a browser session, navigates, and closes browser resources on stop', async () => {
    const page = createPageStub();
    const context = {
      close: vi.fn(async () => {}),
      newPage: vi.fn(async () => page),
    };
    const browser = {
      close: vi.fn(async () => {}),
      newContext: vi.fn(async () => context),
    };
    const browserType = {
      launch: vi.fn(async () => browser),
    };
    const adapter = createPlaywrightAdapter({
      outputDirectory: '/tmp/ui-responsive',
      pathImpl: { join: (...parts) => parts.join('/') },
      fsImpl: { writeFileSync: vi.fn() },
      browserType,
    });

    const session = await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
    });

    expect(browserType.launch).toHaveBeenCalledTimes(1);
    expect(browser.newContext).toHaveBeenCalledTimes(1);
    expect(context.newPage).toHaveBeenCalledTimes(1);
    expect(page.goto).toHaveBeenCalledWith('http://127.0.0.1:5173', expect.any(Object));

    await expect(session.stop()).resolves.toEqual([]);
    expect(page.close).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('resizes, evaluates json and captures screenshots through the active page', async () => {
    const page = createPageStub();
    const context = {
      close: vi.fn(async () => {}),
      newPage: vi.fn(async () => page),
    };
    const browser = {
      close: vi.fn(async () => {}),
      newContext: vi.fn(async () => context),
    };
    const adapter = createPlaywrightAdapter({
      outputDirectory: '/tmp/ui-responsive',
      pathImpl: { join: (...parts) => parts.join('/') },
      fsImpl: { writeFileSync: vi.fn() },
      browserType: { launch: vi.fn(async () => browser) },
    });

    await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
    });

    await adapter.resizeViewport({ width: 390, height: 844 });
    expect(page.setViewportSize).toHaveBeenCalledWith({ width: 390, height: 844 });

    await expect(adapter.evaluateJson('() => ({ hello: "world" })')).resolves.toEqual({ hello: 'world' });

    const screenshotPath = await adapter.captureScreenshot('default');
    expect(screenshotPath).toBe('/tmp/ui-responsive/default-screenshot.png');
    expect(page.screenshot).toHaveBeenCalledWith(expect.objectContaining({
      fullPage: true,
      path: '/tmp/ui-responsive/default-screenshot.png',
      type: 'png',
    }));
  });

  it('collects screenshot, page state, console and network diagnostics', async () => {
    const page = createPageStub();
    const context = {
      close: vi.fn(async () => {}),
      newPage: vi.fn(async () => page),
    };
    const browser = {
      close: vi.fn(async () => {}),
      newContext: vi.fn(async () => context),
    };
    const fsImpl = {
      writeFileSync: vi.fn(),
    };
    const adapter = createPlaywrightAdapter({
      outputDirectory: '/tmp/ui-responsive',
      pathImpl: { join: (...parts) => parts.join('/') },
      fsImpl,
      browserType: { launch: vi.fn(async () => browser) },
    });

    await adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
    });

    page.__emit('console', {
      type: () => 'error',
      text: () => 'boom',
    });
    page.__emit('requestfailed', {
      url: () => 'http://127.0.0.1:5173/api/data',
      method: () => 'GET',
      failure: () => ({ errorText: 'offline' }),
    });

    await adapter.collectDiagnostics({
      label: 'fatal',
      error: new Error('fatal error'),
      remediation: 'fix it',
    });

    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive/fatal-summary.txt',
      expect.stringContaining('error: fatal error'),
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive/fatal-page-state.json',
      expect.stringContaining('"href"'),
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive/fatal-console.log',
      expect.stringContaining('boom'),
      'utf8',
    );
    expect(fsImpl.writeFileSync).toHaveBeenCalledWith(
      '/tmp/ui-responsive/fatal-network.log',
      expect.stringContaining('/api/data'),
      'utf8',
    );
  });

  it('fails clearly when navigation does not reach the requested url and startup closes resources', async () => {
    const page = createPageStub({
      currentUrl: 'about:blank',
      failWaitForUrl: true,
      freezeUrl: true,
    });
    const context = {
      close: vi.fn(async () => {}),
      newPage: vi.fn(async () => page),
    };
    const browser = {
      close: vi.fn(async () => {}),
      newContext: vi.fn(async () => context),
    };
    const adapter = createPlaywrightAdapter({
      fsImpl: { writeFileSync: vi.fn() },
      browserType: { launch: vi.fn(async () => browser) },
    });

    await expect(adapter.startSession({
      url: 'http://127.0.0.1:5173',
      timeoutMs: 25,
    })).rejects.toThrow(/Navigazione Playwright non riuscita/i);

    expect(page.close).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
