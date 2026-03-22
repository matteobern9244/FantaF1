import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
  baseUrl,
  cliStartupTimeoutMs,
  outputDir,
} from './config.mjs';
import { appShellStateExpression } from './dom-expressions.mjs';
import { formatErrorDetails, stringifyDiagnostics } from './diagnostics.mjs';
import { sleep } from './state-validation.mjs';

function sanitizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function createPageFunction(expression) {
  const pageFunction = Function(`return (${expression});`)();

  if (typeof pageFunction !== 'function') {
    throw new Error('Espressione Playwright non valida.');
  }

  return pageFunction;
}

function urlsMatch(actualUrl, expectedUrl) {
  if (!expectedUrl) {
    return Boolean(actualUrl);
  }

  try {
    const actual = new URL(actualUrl);
    const expected = new URL(expectedUrl);

    if (actual.origin !== expected.origin || actual.pathname !== expected.pathname) {
      return false;
    }

    if (expected.hash && actual.hash !== expected.hash) {
      return false;
    }

    for (const [key, value] of expected.searchParams.entries()) {
      if (actual.searchParams.get(key) !== value) {
        return false;
      }
    }

    return true;
  } catch {
    return String(actualUrl).startsWith(String(expectedUrl));
  }
}

function createPlaywrightAdapter({
  browserType = chromium,
  basePageUrl = baseUrl,
  outputDirectory = outputDir,
  fsImpl = fs,
  pathImpl = path,
  startupTimeoutMs = cliStartupTimeoutMs,
  pollIntervalMs = 250,
  launchOptions = { headless: true },
  defaultViewport = { width: 1280, height: 720 },
} = {}) {
  let browser = null;
  let context = null;
  let page = null;
  const consoleEntries = [];
  const networkFailures = [];

  function ensurePage() {
    if (!page) {
      throw new Error('Sessione Playwright non inizializzata.');
    }

    return page;
  }

  function writeTextArtifact(fileName, content) {
    const artifactPath = pathImpl.join(outputDirectory, fileName);
    fsImpl.writeFileSync(artifactPath, content, 'utf8');
    return artifactPath;
  }

  async function waitForCurrentUrl(expectedUrl, {
    timeoutMs = startupTimeoutMs,
    pollInterval = pollIntervalMs,
    failureMessage = `Sessione Playwright non pronta su ${expectedUrl} entro il timeout previsto.`,
  } = {}) {
    const startedAt = Date.now();
    let lastUrl = '';

    while (Date.now() - startedAt < timeoutMs) {
      try {
        lastUrl = await evaluateJson('() => window.location.href', { timeoutMs });
        if (urlsMatch(lastUrl, expectedUrl)) {
          return lastUrl;
        }
      } catch {
        // Retry until timeout
      }

      await sleep(pollInterval);
    }

    throw new Error(failureMessage, {
      cause: lastUrl || 'about:blank',
    });
  }

  async function startSession({
    url = basePageUrl,
    timeoutMs = startupTimeoutMs,
  } = {}) {
    try {
      browser = await browserType.launch(launchOptions);
      context = await browser.newContext({ viewport: defaultViewport });
      page = await context.newPage();
      page.on('console', (message) => {
        consoleEntries.push(`[${message.type()}] ${message.text()}`);
      });
      page.on('requestfailed', (request) => {
        networkFailures.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()?.errorText ?? 'unknown',
        });
      });

      await goto(url, { timeoutMs });

      return {
        sessionId: 'in-process',
        stop,
      };
    } catch (error) {
      await stop();
      throw error;
    }
  }

  async function goto(url, {
    timeoutMs = startupTimeoutMs,
  } = {}) {
    const activePage = ensurePage();
    await activePage.goto(url, {
      timeout: timeoutMs,
      waitUntil: 'domcontentloaded',
    });
    await waitForCurrentUrl(url, {
      timeoutMs,
      failureMessage: `Navigazione Playwright non riuscita verso ${url}.`,
    });
  }

  async function resizeViewport({ width, height }) {
    await ensurePage().setViewportSize({ width, height });
  }

  async function evaluateJson(expression) {
    return await ensurePage().evaluate(createPageFunction(expression));
  }

  async function getPageInfo() {
    return await evaluateJson(appShellStateExpression);
  }

  async function captureScreenshot(name) {
    const screenshotPath = pathImpl.join(outputDirectory, `${sanitizeName(name)}-screenshot.png`);
    await ensurePage().screenshot({
      fullPage: true,
      path: screenshotPath,
      type: 'png',
    });
    return screenshotPath;
  }

  async function collectDiagnostics({
    label = 'fatal',
    error,
    remediation,
  } = {}) {
    const safeLabel = sanitizeName(label);
    let screenshotPath = null;

    try {
      screenshotPath = await captureScreenshot(safeLabel);
    } catch {
      // Best-effort diagnostics
    }

    try {
      const pageState = await getPageInfo();
      writeTextArtifact(`${safeLabel}-page-state.json`, stringifyDiagnostics(pageState));
    } catch (pageError) {
      writeTextArtifact(`${safeLabel}-page-state.txt`, formatErrorDetails(pageError));
    }

    writeTextArtifact(
      `${safeLabel}-console.log`,
      consoleEntries.length > 0 ? consoleEntries.join('\n') : 'Nessun log console raccolto.',
    );
    writeTextArtifact(
      `${safeLabel}-network.log`,
      networkFailures.length > 0 ? stringifyDiagnostics(networkFailures) : 'Nessun request failure raccolto.',
    );
    writeTextArtifact(
      `${safeLabel}-summary.txt`,
      [
        `sessionId: in-process`,
        `label: ${label}`,
        `error: ${error instanceof Error ? error.message : String(error ?? '')}`,
        `cause: ${error instanceof Error && error.cause ? String(error.cause) : ''}`,
        `remediation: ${remediation ?? ''}`,
        `screenshot: ${screenshotPath ?? ''}`,
      ].join('\n'),
    );
  }

  async function stop() {
    const issues = [];

    try {
      await page?.close({ runBeforeUnload: false });
    } catch (error) {
      issues.push(`Chiusura pagina Playwright fallita: ${formatErrorDetails(error)}`);
    }

    try {
      await context?.close();
    } catch (error) {
      issues.push(`Chiusura context Playwright fallita: ${formatErrorDetails(error)}`);
    }

    try {
      await browser?.close();
    } catch (error) {
      issues.push(`Chiusura browser Playwright fallita: ${formatErrorDetails(error)}`);
    }

    page = null;
    context = null;
    browser = null;

    return issues;
  }

  return {
    assertCleanEnvironment() {},
    captureScreenshot,
    collectDiagnostics,
    evaluateJson,
    getPageInfo,
    goto,
    resizeViewport,
    startSession,
    stop,
  };
}

export {
  createPlaywrightAdapter,
  createPageFunction,
  sanitizeName,
  urlsMatch,
};
