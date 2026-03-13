import fs from 'fs';
import net from 'net';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { getChromeWindowLifecycleState } from './dev-launcher-lifecycle.mjs';
import { resolveLauncherTarget, rewriteMongoDatabaseName } from './local-runtime-targets.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const runtimeTarget = resolveLauncherTarget();
const launcherConfig = {
  backendHealthUrl: runtimeTarget.backendHealthUrl,
  frontendUrl: runtimeTarget.baseUrl,
  busyPorts: runtimeTarget.busyPorts,
  pollIntervalMs: 1500,
  startupTimeoutMs: 45000,
};

const launcherText = {
  backendPortBusy: 'La porta 3001 e\' gia in uso. Chiudi il processo esistente e riprova.',
  frontendPortBusy: 'La porta 5173 e\' gia in uso. Chiudi il processo esistente e riprova.',
  backendStartFailed:
    'Il backend non si e\' avviato correttamente. Il frontend non verra\' aperto.',
  frontendStartFailed:
    'Il frontend non e\' raggiungibile. L\'app non verra\' aperta in Chrome.',
  chromeMissing:
    'Google Chrome non e\' disponibile in /Applications. Installa Chrome oppure modifica il launcher.',
  childStopped: 'Uno dei processi locali si e\' fermato. L\'app verra\' chiusa.',
  popupTitle: 'Fanta Formula 1',
};

function buildLauncherEnv({
  baseEnv = process.env,
  envFiles,
  targetConfig = resolveLauncherTarget(baseEnv),
} = {}) {
  const resolvedEnvFiles = envFiles ?? {
    base: loadEnvFile(path.join(projectRoot, '.env')),
    local: loadEnvFile(path.join(projectRoot, '.env.local')),
  };

  const resolvedEnv = {
    ...baseEnv,
    ...resolvedEnvFiles.base,
    ...resolvedEnvFiles.local,
    ...targetConfig.startupEnv,
    FANTAF1_LOCAL_RUNTIME: targetConfig.name,
  };

  if (
    typeof resolvedEnv.MONGODB_URI === 'string'
    && typeof targetConfig.startupEnv?.MONGODB_DB_NAME_OVERRIDE === 'string'
    && typeof targetConfig.startupEnv?.MONGODB_URI !== 'string'
  ) {
    resolvedEnv.MONGODB_URI = rewriteMongoDatabaseName(
      resolvedEnv.MONGODB_URI,
      targetConfig.startupEnv.MONGODB_DB_NAME_OVERRIDE,
    );
  }

  return resolvedEnv;
}

const env = buildLauncherEnv();

let backendProcess = null;
let frontendProcess = null;
let shuttingDown = false;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const parsedEntries = {};
  const fileContent = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    parsedEntries[key] = value;
  }

  return parsedEntries;
}

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function showPopup(message) {
  const script = `display alert "${launcherText.popupTitle}" message "${message}"`;
  spawnSync('osascript', ['-e', script], {
    encoding: 'utf8',
  });
}

async function isPortBusy(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(true);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(false);
      });
    });

    server.listen(port, '127.0.0.1');
  });
}

function startChild(command, args, label) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      showPopup(`${launcherText.childStopped} (${label})`);
      void shutdown(1);
    }
  });

  return child;
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1200),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      await sleep(600);
      continue;
    }

    await sleep(600);
  }

  return false;
}

function openChromeApp(url) {
  const chromeAppPath = '/Applications/Google Chrome.app';
  if (!fs.existsSync(chromeAppPath)) {
    return false;
  }

  spawnSync('open', ['-na', 'Google Chrome', '--args', `--app=${url}`], {
    encoding: 'utf8',
  });

  return true;
}

function escapeAppleScriptString(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function maximizeChromeAppWindow(url) {
  const escapedUrl = escapeAppleScriptString(url);
  const script = `
set targetUrl to "${escapedUrl}"
set screenBounds to {}
tell application "Finder"
  set screenBounds to bounds of window of desktop
end tell
tell application "Google Chrome"
  activate
  repeat 60 times
    repeat with currentWindow in windows
      try
        set currentUrl to URL of active tab of currentWindow
        if currentUrl starts with targetUrl then
          set index of currentWindow to 1
          try
            set zoomed of currentWindow to false
          end try
          delay 0.05
          try
            set zoomed of currentWindow to true
          end try
          delay 0.05
          try
            set bounds of currentWindow to screenBounds
          end try
          return "maximized"
        end if
      end try
    end repeat
    delay 0.25
  end repeat
end tell
return "missing"
`;

  const result = spawnSync('osascript', ['-e', script], {
    encoding: 'utf8',
  });

  return result.stdout.trim() === 'maximized';
}

function isChromeAppWindowOpen(url) {
  const script = `
set targetUrl to "${url}"
tell application "Google Chrome"
  repeat with currentWindow in windows
    repeat with currentTab in tabs of currentWindow
      try
        set currentUrl to URL of currentTab
        if currentUrl starts with targetUrl then
          return "open"
        end if
      end try
    end repeat
  end repeat
end tell
return "closed"
`;

  const result = spawnSync('osascript', ['-e', script], {
    encoding: 'utf8',
  });

  return result.stdout.trim() === 'open';
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of [frontendProcess, backendProcess]) {
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }

  await sleep(1000);

  for (const child of [frontendProcess, backendProcess]) {
    if (child && !child.killed) {
      child.kill('SIGKILL');
    }
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => {
  void shutdown(0);
});

process.on('SIGTERM', () => {
  void shutdown(0);
});

process.on('exit', () => {
  shuttingDown = true;
});

async function main() {
  for (const [index, port] of launcherConfig.busyPorts.entries()) {
    if (await isPortBusy(port)) {
      const template = index === 0 ? launcherText.backendPortBusy : launcherText.frontendPortBusy;
      showPopup(template.replace(index === 0 ? '3001' : '5173', String(port)));
      process.exit(1);
    }
  }

  backendProcess = startChild(runtimeTarget.backendCommand, runtimeTarget.backendArgs, 'backend');

  const backendReady = await waitForUrl(
    launcherConfig.backendHealthUrl,
    launcherConfig.startupTimeoutMs,
  );
  if (!backendReady) {
    showPopup(launcherText.backendStartFailed);
    await shutdown(1);
    return;
  }

  if (runtimeTarget.frontendMode === 'split') {
    frontendProcess = startChild(runtimeTarget.frontendCommand, runtimeTarget.frontendArgs, 'frontend');

    const frontendReady = await waitForUrl(
      launcherConfig.frontendUrl,
      launcherConfig.startupTimeoutMs,
    );
    if (!frontendReady) {
      showPopup(launcherText.frontendStartFailed);
      await shutdown(1);
      return;
    }
  } else {
    const frontendReady = await waitForUrl(
      launcherConfig.frontendUrl,
      launcherConfig.startupTimeoutMs,
    );
    if (!frontendReady) {
      showPopup(launcherText.frontendStartFailed);
      await shutdown(1);
      return;
    }
  }

  if (!openChromeApp(launcherConfig.frontendUrl)) {
    showPopup(launcherText.chromeMissing);
    await shutdown(1);
    return;
  }

  const initiallyMaximized = maximizeChromeAppWindow(launcherConfig.frontendUrl);
  if (!initiallyMaximized) {
    await sleep(1200);
    maximizeChromeAppWindow(launcherConfig.frontendUrl);
  }

  await sleep(1800);

  let chromeWindowSeen = false;

  while (!shuttingDown) {
    const chromeWindowOpen = isChromeAppWindowOpen(launcherConfig.frontendUrl);
    const lifecycleState = getChromeWindowLifecycleState(chromeWindowSeen, chromeWindowOpen);
    chromeWindowSeen = lifecycleState.chromeWindowSeen;

    if (lifecycleState.shouldShutdown) {
      await shutdown(0);
      return;
    }

    await sleep(launcherConfig.pollIntervalMs);
  }
}

const isMainModule =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  void main();
}

export { buildLauncherEnv, main };
