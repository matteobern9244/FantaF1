/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapPwaRuntime, isPushApiSupported, isServiceWorkerSupported, registerServiceWorker } from '../src/pwa/pwaSupport';

describe('PWA support helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (navigator as Partial<Navigator> & { serviceWorker?: unknown }).serviceWorker;
    delete (window as Window & { PushManager?: unknown }).PushManager;
    delete (window as Window & { Notification?: unknown }).Notification;
  });

  it('registers the service worker when browser support is available', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register,
      },
    });

    await expect(registerServiceWorker()).resolves.toEqual({ scope: '/' });
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('returns null when service workers are not supported', async () => {
    await expect(registerServiceWorker()).resolves.toBeNull();
  });

  it('returns null when service worker registration throws', async () => {
    const register = vi.fn().mockRejectedValue(new Error('registration failed'));
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register,
      },
    });

    await expect(registerServiceWorker()).resolves.toBeNull();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('detects push api support only when service worker, push manager and notification exist', () => {
    expect(isServiceWorkerSupported()).toBe(false);
    expect(isPushApiSupported()).toBe(false);

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn(),
      },
    });
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'granted',
        requestPermission: vi.fn(),
      },
    });

    expect(isServiceWorkerSupported()).toBe(true);
    expect(isPushApiSupported()).toBe(true);
  });

  it('bootstraps the pwa runtime by registering the service worker', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register,
      },
    });

    await bootstrapPwaRuntime();

    expect(register).toHaveBeenCalledTimes(1);
  });
});
