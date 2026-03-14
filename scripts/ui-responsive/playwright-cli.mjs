import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import {
  baseUrl,
  cliCleanupTimeoutMs,
  cliCommandTimeoutMs,
  cliRetryTimeoutMs,
  cliStartupTimeoutMs,
  outputDir,
  playwrightCliBaseArgs,
  pollIntervalMs,
  responsiveSessionPrefix,
  sessionName,
} from './config.mjs';
import { appShellStateExpression } from './dom-expressions.mjs';
import { fail, formatErrorDetails, stringifyDiagnostics } from './diagnostics.mjs';
import { stopChild } from './stack.mjs';
import { sleepSync } from './state-validation.mjs';

function buildCliArgs(args, { sessionId } = {}) {
  return [
    ...playwrightCliBaseArgs,
    ...(sessionId ? [`-s=${sessionId}`] : []),
    ...args,
  ];
}

function extractProcessOutput(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function extractResultBlock(output) {
  const match = String(output).match(/### Result\s*([\s\S]*?)(?:\n### Ran Playwright code|\n### Page|\n### Snapshot|$)/);

  if (!match) {
    fail('Impossibile leggere il risultato da Playwright CLI.', output);
  }

  return match[1].trim();
}

function extractMarkdownLinkTarget(output) {
  const match = String(output).match(/\]\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

function sanitizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parsePlaywrightSessions(output) {
  const sessions = [];
  let current = null;

  for (const rawLine of String(output ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const nameMatch = line.match(/^- ([^:\s]+):$/);
    if (nameMatch) {
      current = {
        name: nameMatch[1],
        status: '',
      };
      sessions.push(current);
      continue;
    }

    const statusMatch = line.match(/^- status:\s*(.+)$/i);
    if (statusMatch && current) {
      current.status = statusMatch[1].trim().toLowerCase();
    }
  }

  return sessions;
}

function findStaleResponsiveSessions(output, { prefix = responsiveSessionPrefix } = {}) {
  return parsePlaywrightSessions(output)
    .filter((session) => session.name.startsWith(prefix) && session.status === 'open')
    .map((session) => session.name);
}

function parseCurrentTabUrl(output) {
  const match = String(output).match(/\(current\)\s*\[[^\]]*]\(([^)]+)\)/i);
  return match ? match[1] : null;
}

function buildCleanupInstructions(sessionIds) {
  return [
    `Sessioni rilevate: ${sessionIds.join(', ')}`,
    'Bonifica manuale consigliata:',
    '- npx --yes --package @playwright/cli playwright-cli list',
    '- npx --yes --package @playwright/cli playwright-cli -s=<sessione> close',
    '- in ultima istanza: npx --yes --package @playwright/cli playwright-cli close-all oppure kill-all',
  ].join('\n');
}

function describeCommandError(error) {
  if (error instanceof Error && typeof error.cause === 'string' && error.cause.trim()) {
    return /^Comando Playwright fallito:/i.test(error.message)
      ? error.cause.trim()
      : error.message;
  }

  return formatErrorDetails(error);
}

function createPlaywrightCliAdapter({
  sessionId = sessionName,
  basePageUrl = baseUrl,
  outputDirectory = outputDir,
  cwd = process.cwd(),
  cliTimeoutMs = cliCommandTimeoutMs,
  startupTimeoutMs: sessionStartupTimeoutMs = cliStartupTimeoutMs,
  cleanupTimeoutMs = cliCleanupTimeoutMs,
  pollInterval = pollIntervalMs,
  sessionPrefix = responsiveSessionPrefix,
  spawnImpl = spawn,
  spawnSyncImpl = spawnSync,
  sleepImpl,
  sleepSyncImpl = sleepSync,
  fsImpl = fs,
  pathImpl = path,
} = {}) {
  function shouldRetryTimedOutCommand(args, { timeoutMs, retryOnTimeout = false }) {
    const command = args[0] ?? '';
    return timeoutMs < cliRetryTimeoutMs
      && (['list', 'tab-list'].includes(command) || (retryOnTimeout && command === 'close'));
  }

  function createCommandError(args, {
    timeoutMs = cliTimeoutMs,
    output = '',
    error,
  } = {}) {
    const details = output || error?.message;
    const message = error?.code === 'ETIMEDOUT'
      ? `Comando Playwright scaduto dopo ${timeoutMs}ms: ${args.join(' ')}`
      : details || `Comando Playwright fallito: ${args.join(' ')}`;
    const commandError = new Error(message);

    if (details && details !== message) {
      commandError.cause = details;
    }

    return commandError;
  }

  function isAlreadyClosedError(error) {
    return /not open, please run open first/i.test(describeCommandError(error));
  }

  function executeCommand(args, {
    timeoutMs = cliTimeoutMs,
    sessionScoped = true,
    retryOnTimeout = false,
  } = {}) {
    const timeouts = shouldRetryTimedOutCommand(args, { timeoutMs, retryOnTimeout })
      ? [timeoutMs, cliRetryTimeoutMs]
      : [timeoutMs];
    let lastResult;
    let lastOutput = '';

    for (const resolvedTimeout of timeouts) {
      const result = spawnSyncImpl('npx', buildCliArgs(args, {
        sessionId: sessionScoped ? sessionId : undefined,
      }), {
        cwd,
        encoding: 'utf8',
        timeout: resolvedTimeout,
      });
      const output = extractProcessOutput(result);

      lastResult = result;
      lastOutput = output;

      if (result.error?.code === 'ETIMEDOUT' && resolvedTimeout !== timeouts[timeouts.length - 1]) {
        continue;
      }

      break;
    }

    return {
      status: lastResult?.status ?? 0,
      output: lastOutput,
      error: lastResult?.error,
    };
  }

  function run(args, {
    allowFailure = false,
    timeoutMs = cliTimeoutMs,
    sessionScoped = true,
    retryOnTimeout = false,
  } = {}) {
    const result = executeCommand(args, {
      timeoutMs,
      sessionScoped,
      retryOnTimeout,
    });

    if (result.error) {
      throw createCommandError(args, {
        timeoutMs,
        output: result.output,
        error: result.error,
      });
    }

    if (!allowFailure && result.status !== 0) {
      throw createCommandError(args, {
        timeoutMs,
        output: result.output,
      });
    }

    return result.output;
  }

  function safeRun(args, {
    timeoutMs = cliTimeoutMs,
    sessionScoped = true,
    retryOnTimeout = false,
  } = {}) {
    const result = executeCommand(args, {
      timeoutMs,
      sessionScoped,
      retryOnTimeout,
    });

    if (result.error) {
      return {
        ok: false,
        error: createCommandError(args, {
          timeoutMs,
          output: result.output,
          error: result.error,
        }),
        output: result.output,
        status: result.status,
      };
    }

    if (result.status !== 0) {
      return {
        ok: false,
        error: createCommandError(args, {
          timeoutMs,
          output: result.output,
        }),
        output: result.output,
        status: result.status,
      };
    }

    return {
      ok: true,
      output: result.output,
      status: result.status,
    };
  }

  function evaluateJson(expression, options) {
    const output = run(['eval', expression], options);
    const raw = extractResultBlock(output);

    try {
      return JSON.parse(raw);
    } catch {
      fail('Impossibile fare il parse del risultato JSON di Playwright.', raw);
    }
  }

  function safeEvaluateJson(expression, options) {
    try {
      return {
        ok: true,
        value: evaluateJson(expression, options),
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  function writeTextArtifact(fileName, content) {
    const targetPath = pathImpl.join(outputDirectory, fileName);
    fsImpl.writeFileSync(targetPath, content, 'utf8');
    return targetPath;
  }

  function copyLinkedArtifact(commandOutput, targetBaseName) {
    const linkedPath = extractMarkdownLinkTarget(commandOutput);
    if (!linkedPath) {
      return null;
    }

    const sourcePath = pathImpl.resolve(cwd, linkedPath);
    if (typeof fsImpl.existsSync === 'function' && !fsImpl.existsSync(sourcePath)) {
      return null;
    }

    const extension = pathImpl.extname(sourcePath) || '.txt';
    const targetPath = pathImpl.join(outputDirectory, `${sanitizeName(targetBaseName)}${extension}`);
    fsImpl.copyFileSync(sourcePath, targetPath);
    return targetPath;
  }

  function getPageInfo() {
    return evaluateJson(appShellStateExpression);
  }

  function waitForCurrentUrl(expectedUrl, {
    timeoutMs = sessionStartupTimeoutMs,
    pollInterval: currentPollInterval = pollInterval,
    failureMessage = `Sessione Playwright non pronta su ${expectedUrl} entro il timeout previsto.`,
  } = {}) {
    const startedAt = Date.now();
    let lastUrl = '';

    while (Date.now() - startedAt < timeoutMs) {
      const result = safeRun(['tab-list'], {
        allowFailure: true,
        timeoutMs: cleanupTimeoutMs,
      });

      if (result.ok) {
        lastUrl = parseCurrentTabUrl(result.output) ?? '';
        if (expectedUrl ? lastUrl.startsWith(expectedUrl) : lastUrl) {
          return lastUrl;
        }
      }

      sleepSyncImpl(currentPollInterval);
    }

    fail(failureMessage, lastUrl || 'Nessun tab corrente disponibile.');
  }

  function assertCleanEnvironment() {
    const output = run(['list'], {
      sessionScoped: false,
      timeoutMs: cleanupTimeoutMs,
    });
    const staleSessions = findStaleResponsiveSessions(output, {
      prefix: sessionPrefix,
    });

    if (staleSessions.length > 0) {
      fail(
        `Sessioni Playwright responsive gia' aperte: ${staleSessions.join(', ')}. Chiudi manualmente le sessioni residue prima di rieseguire il test.`,
        buildCleanupInstructions(staleSessions),
      );
    }
  }

  async function startSession({
    url = basePageUrl,
    timeoutMs = sessionStartupTimeoutMs,
    pollInterval: currentPollInterval = pollInterval,
  } = {}) {
    const child = spawnImpl('npx', buildCliArgs(['open', url], { sessionId }), {
      cwd,
      stdio: 'ignore',
    });

    try {
      const initialUrl = waitForCurrentUrl('', {
        timeoutMs,
        pollInterval: currentPollInterval,
      });

      if (url && !initialUrl.startsWith(url)) {
        run(['goto', url]);
      }

      waitForCurrentUrl(url, {
        timeoutMs,
        pollInterval: currentPollInterval,
      });

      return {
        sessionId,
        stop: async () => {
          const issues = [];
          const closeResult = safeRun(['close'], {
            timeoutMs: cleanupTimeoutMs,
            retryOnTimeout: true,
          });

          await stopChild(child, { sleepImpl });

          const listResult = safeRun(['list'], {
            sessionScoped: false,
            timeoutMs: cleanupTimeoutMs,
          });
          const sessionStillOpen = listResult.ok
            && parsePlaywrightSessions(listResult.output)
              .filter((entry) => entry.status === 'open')
              .map((entry) => entry.name)
              .includes(sessionId);
          const sessionClosureVerified = listResult.ok && !sessionStillOpen;

          if (!closeResult.ok && !isAlreadyClosedError(closeResult.error) && !sessionClosureVerified) {
            issues.push(`Chiusura sessione Playwright fallita: ${describeCommandError(closeResult.error)}`);
          }

          if (sessionStillOpen) {
            issues.push(`Sessione Playwright orfana ancora aperta: ${sessionId}. ${buildCleanupInstructions([sessionId])}`);
          }

          return issues;
        },
      };
    } catch (error) {
      await stopChild(child, { sleepImpl });
      throw error;
    }
  }

  function goto(url, {
    timeoutMs = sessionStartupTimeoutMs,
    pollInterval: currentPollInterval = pollInterval,
  } = {}) {
    run(['goto', url]);
    waitForCurrentUrl(url, {
      timeoutMs,
      pollInterval: currentPollInterval,
      failureMessage: `Navigazione Playwright non riuscita verso ${url}.`,
    });
  }

  function captureScreenshot(name) {
    const screenshotResult = safeRun(['screenshot'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });

    if (!screenshotResult.ok) {
      return null;
    }

    return copyLinkedArtifact(screenshotResult.output, `${name}-screenshot`);
  }

  function collectDiagnostics({
    label = 'fatal',
    error,
    remediation,
  } = {}) {
    const safeLabel = sanitizeName(label);
    const screenshotPath = captureScreenshot(safeLabel);

    const tabListResult = safeRun(['tab-list'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    writeTextArtifact(
      `${safeLabel}-tab-list.txt`,
      tabListResult.ok
        ? tabListResult.output
        : `Impossibile leggere i tab Playwright.\n${formatErrorDetails(tabListResult.error)}`,
    );

    const pageInfoResult = safeEvaluateJson(appShellStateExpression, {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    writeTextArtifact(
      pageInfoResult.ok
        ? `${safeLabel}-page-state.json`
        : `${safeLabel}-page-state.txt`,
      pageInfoResult.ok
        ? stringifyDiagnostics(pageInfoResult.value)
        : `Impossibile leggere lo stato pagina.\n${formatErrorDetails(pageInfoResult.error)}`,
    );

    const consoleResult = safeRun(['console', 'info'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    const consolePath = consoleResult.ok
      ? copyLinkedArtifact(consoleResult.output, `${safeLabel}-console`)
      : null;
    if (!consolePath) {
      writeTextArtifact(
        `${safeLabel}-console.txt`,
        consoleResult.ok ? consoleResult.output : formatErrorDetails(consoleResult.error),
      );
    }

    const networkResult = safeRun(['network'], {
      allowFailure: true,
      timeoutMs: cleanupTimeoutMs,
    });
    const networkPath = networkResult.ok
      ? copyLinkedArtifact(networkResult.output, `${safeLabel}-network`)
      : null;
    if (!networkPath) {
      writeTextArtifact(
        `${safeLabel}-network.txt`,
        networkResult.ok ? networkResult.output : formatErrorDetails(networkResult.error),
      );
    }

    const summaryLines = [
      `sessionId: ${sessionId}`,
      `label: ${safeLabel}`,
      `error: ${formatErrorDetails(error)}`,
    ];

    if (error?.cause) {
      summaryLines.push(
        `cause: ${typeof error.cause === 'string' ? error.cause : stringifyDiagnostics(error.cause)}`,
      );
    }

    if (remediation) {
      summaryLines.push(`remediation: ${remediation}`);
    }

    if (screenshotPath) {
      summaryLines.push(`screenshot: ${screenshotPath}`);
    }

    const summaryPath = writeTextArtifact(`${safeLabel}-summary.txt`, summaryLines.join('\n'));

    return {
      summaryPath,
      screenshotPath,
      consolePath,
      networkPath,
    };
  }

  return {
    assertCleanEnvironment,
    captureScreenshot,
    collectDiagnostics,
    evaluateJson,
    getPageInfo,
    goto,
    run,
    safeRun,
    sessionId,
    startSession,
  };
}

export {
  buildCleanupInstructions,
  buildCliArgs,
  createPlaywrightCliAdapter,
  describeCommandError,
  extractMarkdownLinkTarget,
  extractProcessOutput,
  extractResultBlock,
  findStaleResponsiveSessions,
  parseCurrentTabUrl,
  parsePlaywrightSessions,
  sanitizeName,
};
