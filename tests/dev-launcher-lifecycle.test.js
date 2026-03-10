import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getChromeWindowLifecycleState } from '../scripts/dev-launcher-lifecycle.mjs';

const projectRoot = path.resolve(__dirname, '..');
const startCommandPath = path.join(projectRoot, 'start_fantaf1.command');

describe('dev launcher Chrome lifecycle tracking', () => {
  it('keeps the local stack alive until the Chrome app window becomes observable', () => {
    expect(getChromeWindowLifecycleState(false, false)).toEqual({
      chromeWindowSeen: false,
      shouldShutdown: false,
    });

    expect(getChromeWindowLifecycleState(false, true)).toEqual({
      chromeWindowSeen: true,
      shouldShutdown: false,
    });
  });

  it('shuts down only after a previously observed Chrome app window is closed', () => {
    expect(getChromeWindowLifecycleState(true, true)).toEqual({
      chromeWindowSeen: true,
      shouldShutdown: false,
    });

    expect(getChromeWindowLifecycleState(true, false)).toEqual({
      chromeWindowSeen: true,
      shouldShutdown: true,
    });
  });

  it('forces the local launcher to run in development mode', () => {
    const launcherScript = fs.readFileSync(startCommandPath, 'utf8');

    expect(launcherScript).toMatch(/export NODE_ENV=development/);
  });

  it('does not run the responsive browser check inside the monitored launcher preflight', () => {
    const launcherScript = fs.readFileSync(startCommandPath, 'utf8');

    expect(launcherScript).not.toMatch(/npm run test:ui-responsive/);
  });

  it('forces the Node local launcher env to development even if the parent env is production', async () => {
    const { buildLauncherEnv } = await import('../scripts/dev-launcher.mjs');

    const launcherEnv = buildLauncherEnv({
      baseEnv: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://example.test/fantaf1_dev',
      },
      envFiles: {},
    });

    expect(launcherEnv.NODE_ENV).toBe('development');
  });
});
