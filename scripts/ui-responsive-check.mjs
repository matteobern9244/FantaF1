import { pathToFileURL } from 'url';
import { cleanupResponsiveCheck } from './ui-responsive/cleanup.mjs';
import { ensureNpx, prepareOutputDirectory } from './ui-responsive/diagnostics.mjs';
import { createPlaywrightCliAdapter, findStaleResponsiveSessions } from './ui-responsive/playwright-cli.mjs';
import { buildResponsiveScenarios } from './ui-responsive/scenarios.mjs';
import { ensureLocalAppStack } from './ui-responsive/stack.mjs';
import {
  canSelectSprintWeekend,
  canSwitchWeekend,
  isAppShellReady,
  validateState,
  waitForAppShell,
} from './ui-responsive/state-validation.mjs';
import { runResponsiveCheck } from './ui-responsive/run-responsive-check.mjs';

async function main() {
  const result = await runResponsiveCheck({
    ensureNpx,
    prepareOutputDirectory,
    ensureLocalAppStack,
    createPlaywrightCliAdapter,
    buildResponsiveScenarios,
    cleanupResponsiveCheck,
  });

  process.exitCode = result.exitCode;
}

const isMainModule =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await main();
}

export {
  buildResponsiveScenarios,
  canSelectSprintWeekend,
  canSwitchWeekend,
  cleanupResponsiveCheck,
  createPlaywrightCliAdapter,
  ensureLocalAppStack,
  findStaleResponsiveSessions,
  isAppShellReady,
  main,
  runResponsiveCheck,
  validateState,
  waitForAppShell,
};
