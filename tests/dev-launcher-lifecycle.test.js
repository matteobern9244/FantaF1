import { describe, expect, it } from 'vitest';
import { getChromeWindowLifecycleState } from '../scripts/dev-launcher-lifecycle.mjs';

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
});
