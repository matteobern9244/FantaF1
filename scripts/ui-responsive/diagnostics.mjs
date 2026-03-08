import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { cliCleanupTimeoutMs, outputDir, projectRoot } from './config.mjs';

function fail(message, details) {
  const error = new Error(message);

  if (details) {
    error.cause = details;
  }

  throw error;
}

function formatErrorDetails(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? 'Errore sconosciuto');
}

function stringifyDiagnostics(value) {
  return JSON.stringify(value, null, 2);
}

function markDiagnosticsCollected(error) {
  if (error && typeof error === 'object') {
    error.diagnosticsCollected = true;
  }

  return error;
}

function hasDiagnosticsCollected(error) {
  return Boolean(error && typeof error === 'object' && error.diagnosticsCollected);
}

function ensureNpx({ spawnSyncImpl = spawnSync, cwd = process.cwd() } = {}) {
  const result = spawnSyncImpl('npx', ['--version'], {
    cwd,
    encoding: 'utf8',
    timeout: cliCleanupTimeoutMs,
  });

  if (result.error || result.status !== 0) {
    fail('npx non disponibile. Installa Node.js/npm prima di eseguire il controllo responsive.');
  }
}

function loadEnvFile(filePath, { fsImpl = fs } = {}) {
  if (!fsImpl.existsSync(filePath)) {
    return {};
  }

  const parsedEntries = {};
  const fileContent = fsImpl.readFileSync(filePath, 'utf8');

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
    parsedEntries[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return parsedEntries;
}

function loadRuntimeEnv({
  env = process.env,
  fsImpl = fs,
  projectRootPath = projectRoot,
  pathImpl = path,
} = {}) {
  return {
    ...env,
    ...loadEnvFile(pathImpl.join(projectRootPath, '.env'), { fsImpl }),
    ...loadEnvFile(pathImpl.join(projectRootPath, '.env.local'), { fsImpl }),
    NODE_ENV: 'development',
  };
}

function prepareOutputDirectory({ fsImpl = fs, outputDirectory = outputDir } = {}) {
  fsImpl.rmSync(outputDirectory, { recursive: true, force: true });
  fsImpl.mkdirSync(outputDirectory, { recursive: true });
}

export {
  ensureNpx,
  fail,
  formatErrorDetails,
  hasDiagnosticsCollected,
  loadEnvFile,
  loadRuntimeEnv,
  markDiagnosticsCollected,
  prepareOutputDirectory,
  stringifyDiagnostics,
};
