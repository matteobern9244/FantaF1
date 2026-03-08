import { spawn } from 'child_process';
import { backendHealthUrl, baseUrl, pollIntervalMs, projectRoot, startupTimeoutMs } from './config.mjs';
import { fail, loadRuntimeEnv } from './diagnostics.mjs';

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function waitForUrl(url, {
  fetchImpl = fetch,
  timeoutMs = startupTimeoutMs,
  pollInterval = pollIntervalMs,
  readyWhen = (response) => Boolean(response?.ok),
  label = url,
  failureMessage,
  sleepImpl = sleep,
} = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(1500),
      });

      if (readyWhen(response)) {
        return;
      }
    } catch {
      // Retry until timeout
    }

    await sleepImpl(pollInterval);
  }

  fail(failureMessage ?? `Servizio non raggiungibile su ${label}.`);
}

async function probeUrl(url, { fetchImpl = fetch } = {}) {
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(1500),
    });

    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

async function waitForApiReadiness(
  urls,
  {
    fetchImpl = fetch,
    timeoutMs = startupTimeoutMs,
    pollInterval = pollIntervalMs,
    sleepImpl = sleep,
  } = {},
) {
  const pendingUrls = new Set(urls);
  const startedAt = Date.now();

  while (pendingUrls.size > 0 && Date.now() - startedAt < timeoutMs) {
    const probes = await Promise.all(
      [...pendingUrls].map(async (url) => ({
        url,
        ok: await probeUrl(url, { fetchImpl }),
      })),
    );

    for (const probe of probes) {
      if (probe.ok) {
        pendingUrls.delete(probe.url);
      }
    }

    if (pendingUrls.size === 0) {
      return;
    }

    await sleepImpl(pollInterval);
  }

  fail(`API applicative non pronte entro il timeout previsto: ${[...pendingUrls].join(', ')}`);
}

function startChild(command, args, {
  cwd = projectRoot,
  env = loadRuntimeEnv(),
  spawnImpl = spawn,
} = {}) {
  return spawnImpl(command, args, {
    cwd,
    env,
    stdio: 'ignore',
  });
}

function isChildRunning(child) {
  return Boolean(child) && child.exitCode == null && child.signalCode == null;
}

async function stopChild(child, { sleepImpl = sleep } = {}) {
  if (!child || typeof child.kill !== 'function') {
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {
    return;
  }

  await sleepImpl(1000);

  if (isChildRunning(child)) {
    try {
      child.kill('SIGKILL');
    } catch {
      // Ignore best-effort cleanup failures
    }
  }
}

async function ensureLocalAppStack({
  frontendUrl = baseUrl,
  backendUrl = backendHealthUrl,
  appProbeUrls = [
    `${baseUrl}/api/session`,
    `${baseUrl}/api/data`,
    `${baseUrl}/api/drivers`,
    `${baseUrl}/api/calendar`,
  ],
  fetchImpl = fetch,
  spawnImpl = spawn,
  sleepImpl = sleep,
  timeoutMs = startupTimeoutMs,
  pollInterval = pollIntervalMs,
  pollIntervalMs: pollIntervalOverride,
  cwd = projectRoot,
  env = loadRuntimeEnv(),
  backendCommand = 'node',
  backendArgs = ['server.js'],
  frontendCommand = 'npm',
  frontendArgs = ['run', 'dev:frontend'],
} = {}) {
  const resolvedPollInterval = pollIntervalOverride ?? pollInterval;
  const frontendReachable = await probeUrl(frontendUrl, { fetchImpl });
  const backendReachable = await probeUrl(backendUrl, { fetchImpl });

  if (frontendReachable && backendReachable) {
    await waitForApiReadiness(appProbeUrls, {
      fetchImpl,
      timeoutMs,
      pollInterval: resolvedPollInterval,
      sleepImpl,
    });

    return {
      started: false,
      stop: async () => {},
    };
  }

  if (frontendReachable !== backendReachable) {
    fail(
      frontendReachable
        ? `Frontend raggiungibile su ${frontendUrl} ma backend non pronto su ${backendUrl}. Chiudi lo stack locale parziale e riesegui il controllo responsive.`
        : `Backend raggiungibile su ${backendUrl} ma frontend non pronto su ${frontendUrl}. Chiudi lo stack locale parziale e riesegui il controllo responsive.`,
    );
  }

  const backendChild = startChild(backendCommand, backendArgs, {
    cwd,
    env,
    spawnImpl,
  });

  try {
    await waitForUrl(backendUrl, {
      fetchImpl,
      timeoutMs,
      pollInterval: resolvedPollInterval,
      label: backendUrl,
      failureMessage: `Backend non raggiungibile su ${backendUrl}.`,
      sleepImpl,
    });

    const frontendChild = startChild(frontendCommand, frontendArgs, {
      cwd,
      env,
      spawnImpl,
    });

    try {
      await waitForUrl(frontendUrl, {
        fetchImpl,
        timeoutMs,
        pollInterval: resolvedPollInterval,
        label: frontendUrl,
        failureMessage: `Frontend non raggiungibile su ${frontendUrl}.`,
        sleepImpl,
      });

      await waitForApiReadiness(appProbeUrls, {
        fetchImpl,
        timeoutMs,
        pollInterval: resolvedPollInterval,
        sleepImpl,
      });

      return {
        started: true,
        stop: async () => {
          await stopChild(frontendChild, { sleepImpl });
          await stopChild(backendChild, { sleepImpl });
        },
      };
    } catch (error) {
      await stopChild(frontendChild, { sleepImpl });
      await stopChild(backendChild, { sleepImpl });
      throw error;
    }
  } catch (error) {
    await stopChild(backendChild, { sleepImpl });
    throw error;
  }
}

async function waitForFrontend(url, timeoutMs = startupTimeoutMs) {
  await waitForUrl(url, {
    timeoutMs,
    label: url,
    failureMessage: `Frontend non raggiungibile su ${url}. Avvia backend e frontend locali prima del test.`,
  });
}

export {
  ensureLocalAppStack,
  isChildRunning,
  probeUrl,
  sleep,
  startChild,
  stopChild,
  waitForApiReadiness,
  waitForFrontend,
  waitForUrl,
};
