import { formatErrorDetails } from './diagnostics.mjs';

async function cleanupResponsiveCheck({
  playwrightSession,
  localStack,
  consoleImpl = console,
} = {}) {
  const issues = [];

  try {
    if (playwrightSession?.stop) {
      const sessionIssues = await playwrightSession.stop();
      if (Array.isArray(sessionIssues)) {
        issues.push(...sessionIssues);
      }
    }
  } catch (error) {
    issues.push(`Teardown sessione Playwright fallito: ${formatErrorDetails(error)}`);
  }

  try {
    await localStack?.stop?.();
  } catch (error) {
    issues.push(`Arresto stack locale fallito: ${formatErrorDetails(error)}`);
  }

  for (const issue of issues) {
    consoleImpl.error(`[ui-responsive] ${issue}`);
  }

  return issues;
}

export { cleanupResponsiveCheck };
