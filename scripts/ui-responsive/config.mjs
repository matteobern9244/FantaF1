import path from 'path';
import { fileURLToPath } from 'url';
import { resolveUiResponsiveTarget } from '../local-runtime-targets.mjs';

const runtimeTarget = resolveUiResponsiveTarget();
const baseUrl = runtimeTarget.baseUrl;
const backendHealthUrl = runtimeTarget.backendHealthUrl;
const startupTimeoutMs = 45000;
const pollIntervalMs = 750;
const cliStartupTimeoutMs = 60000;
const uiShellTimeoutMs = 30000;
const uiShellPollIntervalMs = 250;
const breakpoints = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'iphone-16-pro-max', width: 440, height: 956 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'laptop', width: 1280, height: 800 },
  { label: 'desktop', width: 1600, height: 900 },
  { label: 'desktop-xl', width: 1920, height: 1080 },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.resolve(projectRoot, 'output/playwright/ui-responsive');

export {
  backendHealthUrl,
  baseUrl,
  breakpoints,
  cliStartupTimeoutMs,
  outputDir,
  pollIntervalMs,
  projectRoot,
  runtimeTarget,
  startupTimeoutMs,
  uiShellPollIntervalMs,
  uiShellTimeoutMs,
};
