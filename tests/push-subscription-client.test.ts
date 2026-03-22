/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPushNotificationConfiguration,
  fetchPushPublicKey,
  getCurrentPushSubscription,
  sendPushTestNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../src/pwa/pushSubscriptionClient';

describe('push subscription client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
    delete (window as Window & { PushManager?: unknown }).PushManager;
    delete (window as Window & { Notification?: unknown }).Notification;
  });

  function installPushSupport() {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({}),
      },
    });
  }

  function createServiceWorkerReady(hasSubscription = true) {
    const subscription = {
      endpoint: 'https://push.example/subscription',
      expirationTime: null,
      toJSON: vi.fn(() => ({
        endpoint: 'https://push.example/subscription',
        expirationTime: null,
        keys: {
          auth: 'auth-key',
          p256dh: 'p256dh-key',
        },
      })),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    const subscribe = vi.fn().mockResolvedValue(subscription);
    const getSubscription = vi.fn().mockResolvedValue(hasSubscription ? subscription : null);
    const serviceWorkerReady = Promise.resolve({
      pushManager: {
        subscribe,
        getSubscription,
      },
    });

    return {
      subscription,
      subscribe,
      getSubscription,
      serviceWorkerReady,
    };
  }

  function createFallbackSubscriptionReady() {
    const subscription = {
      endpoint: 'https://push.example/fallback-subscription',
      expirationTime: 123456,
      toJSON: vi.fn(() => ({})),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    const serviceWorkerReady = Promise.resolve({
      pushManager: {
        subscribe: vi.fn().mockResolvedValue(subscription),
        getSubscription: vi.fn().mockResolvedValue(subscription),
      },
    });

    return {
      subscription,
      serviceWorkerReady,
    };
  }

  it('subscribes and sends the normalized payload to the backend', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { serviceWorkerReady, subscribe } = createServiceWorkerReady();

    const result = await subscribeToPushNotifications({
      applicationServerKey: 'BEl6LWtleQ',
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    });

    expect(result.status).toBe('subscribed');
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push-subscriptions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://push.example/subscription',
          expirationTime: null,
          auth: 'auth-key',
          p256dh: 'p256dh-key',
        }),
      }),
    );
  });

  it('subscribes without an application server key when the browser already exposes the push context', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { serviceWorkerReady, subscribe } = createServiceWorkerReady();

    const result = await subscribeToPushNotifications({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    });

    expect(result.status).toBe('subscribed');
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true });
  });

  it('subscribes with a binary application server key without converting it', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { serviceWorkerReady, subscribe } = createServiceWorkerReady();
    const binaryKey = new Uint8Array([1, 2, 3, 4]);

    await subscribeToPushNotifications({
      applicationServerKey: binaryKey,
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    });

    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: binaryKey,
    });
  });

  it('returns unsupported when the push stack is unavailable', async () => {
    await expect(subscribeToPushNotifications()).resolves.toEqual({ status: 'unsupported' });
    await expect(unsubscribeFromPushNotifications()).resolves.toEqual({ status: 'unsupported' });
    await expect(getCurrentPushSubscription()).resolves.toBeNull();
  });

  it('returns permission-denied when notification permission is rejected', async () => {
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
    });

    await expect(subscribeToPushNotifications()).resolves.toEqual({ status: 'permission-denied' });
  });

  it('returns unsupported when the notification api is unavailable even if service workers exist', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({}),
      },
    });
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: function PushManager() {},
    });

    await expect(subscribeToPushNotifications()).resolves.toEqual({ status: 'unsupported' });
  });

  it('loads the public key configuration from the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ publicKey: 'test-public-key' }),
    });

    await expect(fetchPushPublicKey({ fetchFn: fetchMock as typeof fetch })).resolves.toBe('test-public-key');
    await expect(fetchPushNotificationConfiguration({ fetchFn: fetchMock as typeof fetch })).resolves.toEqual({
      enabled: true,
      publicKey: 'test-public-key',
    });
  });

  it('preserves a disabled push configuration from the backend payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ enabled: false, publicKey: 'test-public-key' }),
    });

    await expect(
      fetchPushNotificationConfiguration({ fetchFn: fetchMock as typeof fetch }),
    ).resolves.toEqual({
      enabled: false,
      publicKey: 'test-public-key',
    });
  });

  it('uses a custom endpoint when loading the push configuration', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ enabled: true, publicKey: 'custom-key' }),
    });

    await expect(
      fetchPushNotificationConfiguration({
        endpoint: '/custom-config',
        fetchFn: fetchMock as typeof fetch,
      }),
    ).resolves.toEqual({
      enabled: true,
      publicKey: 'custom-key',
    });

    expect(fetchMock).toHaveBeenCalledWith('/custom-config');
  });

  it('falls back to the global fetch implementation for push configuration requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ enabled: true, publicKey: 'global-key' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPushNotificationConfiguration()).resolves.toEqual({
      enabled: true,
      publicKey: 'global-key',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/push-notifications/config');
  });

  it('throws when the public key endpoint fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });

    await expect(fetchPushPublicKey({ fetchFn: fetchMock as typeof fetch })).rejects.toThrow(
      'Push public key is not available.',
    );
  });

  it('throws when the public key payload is missing the key value', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ enabled: true, publicKey: '' }),
    });

    await expect(fetchPushPublicKey({ fetchFn: fetchMock as typeof fetch })).rejects.toThrow(
      'Push public key is not available.',
    );
  });

  it('falls back to the global fetch implementation for the public key request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ publicKey: 'global-public-key' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPushPublicKey()).resolves.toBe('global-public-key');
    expect(fetchMock).toHaveBeenCalledWith('/api/push-notifications/config');
  });

  it('throws when the push configuration endpoint fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });

    await expect(
      fetchPushNotificationConfiguration({ fetchFn: fetchMock as typeof fetch }),
    ).rejects.toThrow('Failed to load push notification configuration.');
  });

  it('throws when the push configuration payload is incomplete', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ enabled: true, publicKey: '' }),
    });

    await expect(
      fetchPushNotificationConfiguration({ fetchFn: fetchMock as typeof fetch }),
    ).rejects.toThrow('Failed to load push notification configuration.');
  });

  it('returns the current push subscription when it exists', async () => {
    installPushSupport();
    const { serviceWorkerReady, subscription } = createServiceWorkerReady();

    await expect(getCurrentPushSubscription({ serviceWorkerReady })).resolves.toBe(subscription);
  });

  it('accepts a lazy service worker ready provider', async () => {
    installPushSupport();
    const { serviceWorkerReady, subscription } = createServiceWorkerReady();

    await expect(getCurrentPushSubscription({ serviceWorkerReady: () => serviceWorkerReady })).resolves.toBe(subscription);
  });

  it('reads the current subscription from navigator.serviceWorker.ready by default', async () => {
    installPushSupport();
    const { subscription, serviceWorkerReady } = createServiceWorkerReady();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: serviceWorkerReady,
      },
    });

    await expect(getCurrentPushSubscription()).resolves.toBe(subscription);
  });

  it('sends a test notification for the active subscription', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(sendPushTestNotification({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).resolves.toEqual({ status: 'sent', endpoint: 'https://push.example/subscription' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push-notifications/test-delivery',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ endpoint: 'https://push.example/subscription' }),
      }),
    );
  });

  it('returns idle when no active subscription exists for a test notification', async () => {
    installPushSupport();
    const fetchMock = vi.fn();
    const { serviceWorkerReady } = createServiceWorkerReady(false);

    await expect(sendPushTestNotification({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).resolves.toEqual({ status: 'idle' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the test delivery endpoint fails', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(sendPushTestNotification({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).rejects.toThrow('Failed to deliver push notification.');
  });

  it('falls back to the global fetch implementation when sending a test notification', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(sendPushTestNotification({ serviceWorkerReady })).resolves.toEqual({
      status: 'sent',
      endpoint: 'https://push.example/subscription',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push-notifications/test-delivery',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when the backend cannot store the push subscription', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(subscribeToPushNotifications({
      applicationServerKey: 'BEl6LWtleQ',
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).rejects.toThrow('Failed to store push subscription.');
  });

  it('falls back to the browser subscription fields when toJSON omits endpoint metadata', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { subscription, serviceWorkerReady } = createFallbackSubscriptionReady();

    await expect(subscribeToPushNotifications({
      endpoint: '/custom-subscriptions',
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).resolves.toEqual(
      expect.objectContaining({ status: 'subscribed', subscription }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/custom-subscriptions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://push.example/fallback-subscription',
          expirationTime: 123456,
        }),
      }),
    );
  });

  it('falls back to the global fetch implementation when storing a subscription', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(subscribeToPushNotifications({
      applicationServerKey: 'BEl6LWtleQ',
      serviceWorkerReady,
    })).resolves.toEqual(expect.objectContaining({ status: 'subscribed' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push-subscriptions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses an injected notification implementation when requesting permission', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { serviceWorkerReady } = createServiceWorkerReady();
    const notification = {
      permission: 'default' as const,
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    await expect(subscribeToPushNotifications({
      applicationServerKey: 'BEl6LWtleQ',
      fetchFn: fetchMock as typeof fetch,
      notification,
      serviceWorkerReady,
    })).resolves.toEqual(
      expect.objectContaining({ status: 'subscribed' }),
    );

    expect(notification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes the active subscription and notifies the backend', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { serviceWorkerReady, subscription } = createServiceWorkerReady();

    const result = await unsubscribeFromPushNotifications({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    });

    expect(result.status).toBe('unsubscribed');
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push-subscriptions?endpoint=https%3A%2F%2Fpush.example%2Fsubscription',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('returns idle when no active subscription exists during unsubscribe', async () => {
    installPushSupport();
    const fetchMock = vi.fn();
    const { serviceWorkerReady } = createServiceWorkerReady(false);

    await expect(unsubscribeFromPushNotifications({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).resolves.toEqual({ status: 'idle' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not notify the backend when browser unsubscribe fails', async () => {
    installPushSupport();
    const fetchMock = vi.fn();
    const { serviceWorkerReady, subscription } = createServiceWorkerReady();
    subscription.unsubscribe.mockResolvedValue(false);

    await expect(unsubscribeFromPushNotifications({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).rejects.toThrow('Failed to unsubscribe from push notifications.');

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the backend cannot remove the subscription after browser unsubscribe', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(unsubscribeFromPushNotifications({
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).rejects.toThrow('Failed to remove push subscription.');
  });

  it('uses a custom endpoint when removing the subscription from the backend', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(unsubscribeFromPushNotifications({
      endpoint: '/custom-subscriptions',
      fetchFn: fetchMock as typeof fetch,
      serviceWorkerReady,
    })).resolves.toEqual(
      expect.objectContaining({ status: 'unsubscribed', unsubscribed: true }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/custom-subscriptions?endpoint=https%3A%2F%2Fpush.example%2Fsubscription',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('falls back to the global fetch implementation when deleting a subscription', async () => {
    installPushSupport();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { serviceWorkerReady } = createServiceWorkerReady();

    await expect(unsubscribeFromPushNotifications({
      serviceWorkerReady,
    })).resolves.toEqual(expect.objectContaining({ status: 'unsubscribed' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/push-subscriptions?endpoint=https%3A%2F%2Fpush.example%2Fsubscription',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
