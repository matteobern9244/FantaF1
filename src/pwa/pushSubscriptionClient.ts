import {
  pushNotificationConfigEndpoint,
  pushSubscriptionEndpoint,
  pushTestNotificationEndpoint,
} from './pwaConstants';
import { isPushApiSupported } from './pwaSupport';

interface NotificationLike {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission> | NotificationPermission;
}

interface PushSubscriptionLike {
  endpoint: string;
  expirationTime: number | null;
  toJSON: () => unknown;
  unsubscribe: () => Promise<boolean>;
}

interface PushManagerLike {
  getSubscription: () => Promise<PushSubscriptionLike | null>;
  subscribe: (options: PushSubscriptionOptionsInit) => Promise<PushSubscriptionLike>;
}

interface ServiceWorkerReadyLike {
  pushManager: PushManagerLike;
}

type ServiceWorkerReadyProvider = Promise<ServiceWorkerReadyLike> | (() => Promise<ServiceWorkerReadyLike>);

interface SubscribePushOptions {
  applicationServerKey?: BufferSource | string;
  endpoint?: string;
  fetchFn?: typeof fetch;
  notification?: NotificationLike;
  serviceWorkerReady?: ServiceWorkerReadyProvider;
}

interface UnsubscribePushOptions {
  endpoint?: string;
  fetchFn?: typeof fetch;
  serviceWorkerReady?: ServiceWorkerReadyProvider;
}

interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  auth?: string;
  p256dh?: string;
}

interface PushSubscriptionResult {
  status: 'subscribed' | 'permission-denied' | 'unsupported';
  subscription?: PushSubscriptionLike;
}

interface PushUnsubscribeResult {
  status: 'unsubscribed' | 'idle' | 'unsupported';
  subscription?: PushSubscriptionLike;
  unsubscribed?: boolean;
}

interface PushPublicKeyResponse {
  publicKey: string;
}

function resolveServiceWorkerReady(serviceWorkerReady?: ServiceWorkerReadyProvider) {
  if (typeof serviceWorkerReady === 'function') {
    return serviceWorkerReady();
  }

  if (serviceWorkerReady) {
    return serviceWorkerReady;
  }

  /* v8 ignore start -- callers gate this path behind isPushApiSupported */
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }
  /* v8 ignore stop */

  return navigator.serviceWorker.ready as Promise<ServiceWorkerReadyLike>;
}

function resolveNotification(notification?: NotificationLike) {
  if (notification) {
    return notification;
  }

  /* v8 ignore start -- callers gate this path behind isPushApiSupported */
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return null;
  }
  /* v8 ignore stop */

  return Notification as unknown as NotificationLike;
}

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function resolveApplicationServerKey(applicationServerKey?: BufferSource | string) {
  if (typeof applicationServerKey === 'string') {
    return base64UrlToUint8Array(applicationServerKey);
  }

  return applicationServerKey;
}

async function getCurrentPushSubscription(options: UnsubscribePushOptions = {}) {
  if (!isPushApiSupported()) {
    return null;
  }

  const registration = await resolveServiceWorkerReady(options.serviceWorkerReady);
  return registration.pushManager.getSubscription();
}

async function fetchPushPublicKey(options: Pick<SubscribePushOptions, 'endpoint' | 'fetchFn'> = {}) {
  const response = await (options.fetchFn ?? fetch)(options.endpoint ?? pushNotificationConfigEndpoint);
  if (!response.ok) {
    throw new Error('Push public key is not available.');
  }

  const payload = await response.json() as PushPublicKeyResponse & { enabled?: boolean };
  if (!payload.publicKey) {
    throw new Error('Push public key is not available.');
  }

  return payload.publicKey;
}

async function sendTestPushNotification({
  endpoint,
  fetchFn,
}: {
  endpoint: string;
  fetchFn?: typeof fetch;
}) {
  const response = await (fetchFn ?? fetch)(pushTestNotificationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    throw new Error('Failed to deliver push notification.');
  }
}

async function fetchPushNotificationConfiguration(options: Pick<SubscribePushOptions, 'endpoint' | 'fetchFn'> = {}) {
  const response = await (options.fetchFn ?? fetch)(options.endpoint ?? pushNotificationConfigEndpoint);
  if (!response.ok) {
    throw new Error('Failed to load push notification configuration.');
  }

  const payload = await response.json() as PushPublicKeyResponse & { enabled?: boolean };
  if (!payload.publicKey) {
    throw new Error('Failed to load push notification configuration.');
  }

  return {
    enabled: payload.enabled ?? true,
    publicKey: payload.publicKey,
  };
}

async function sendPushTestNotification(options: UnsubscribePushOptions & { fetchFn?: typeof fetch } = {}) {
  const subscription = await getCurrentPushSubscription(options);
  if (!subscription) {
    return { status: 'idle' as const };
  }

  await sendTestPushNotification({
    endpoint: subscription.endpoint,
    fetchFn: options.fetchFn,
  });

  return {
    status: 'sent' as const,
    endpoint: subscription.endpoint,
  };
}

async function subscribeToPushNotifications(options: SubscribePushOptions = {}): Promise<PushSubscriptionResult> {
  if (!isPushApiSupported()) {
    return { status: 'unsupported' };
  }

  const notification = resolveNotification(options.notification);
  /* v8 ignore start -- unreachable while isPushApiSupported requires Notification in window */
  if (!notification) {
    return { status: 'unsupported' };
  }
  /* v8 ignore stop */

  let permission = notification.permission;
  if (permission === 'default') {
    permission = await notification.requestPermission();
  }

  if (permission !== 'granted') {
    return { status: 'permission-denied' };
  }

  const registration = await resolveServiceWorkerReady(options.serviceWorkerReady);
  const browserSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    ...(options.applicationServerKey
      ? { applicationServerKey: resolveApplicationServerKey(options.applicationServerKey) }
      : {}),
  });
  const subscription = browserSubscription.toJSON() as {
    endpoint?: string;
    expirationTime?: number | null;
    keys?: { auth?: string; p256dh?: string };
  };

  const payload: PushSubscriptionPayload = {
    endpoint: subscription.endpoint ?? browserSubscription.endpoint,
    expirationTime: subscription.expirationTime ?? browserSubscription.expirationTime,
    auth: subscription.keys?.auth,
    p256dh: subscription.keys?.p256dh,
  };

  const response = await (options.fetchFn ?? fetch)(options.endpoint ?? pushSubscriptionEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to store push subscription.');
  }

  return {
    status: 'subscribed',
    subscription: browserSubscription,
  };
}

async function unsubscribeFromPushNotifications(options: UnsubscribePushOptions = {}): Promise<PushUnsubscribeResult> {
  if (!isPushApiSupported()) {
    return { status: 'unsupported' };
  }

  const registration = await resolveServiceWorkerReady(options.serviceWorkerReady);
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return { status: 'idle' };
  }

  const unsubscribed = await subscription.unsubscribe();
  if (!unsubscribed) {
    throw new Error('Failed to unsubscribe from push notifications.');
  }

  const endpointUrl = new URL(options.endpoint ?? pushSubscriptionEndpoint, 'https://fantaf1.local');
  endpointUrl.searchParams.set('endpoint', subscription.endpoint);

  const response = await (options.fetchFn ?? fetch)(`${endpointUrl.pathname}${endpointUrl.search}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to remove push subscription.');
  }

  return {
    status: 'unsubscribed',
    subscription,
    unsubscribed,
  };
}

export type {
  NotificationLike,
  PushManagerLike,
  PushSubscriptionLike,
  PushSubscriptionResult,
  PushUnsubscribeResult,
  ServiceWorkerReadyProvider,
};
export {
  fetchPushNotificationConfiguration,
  fetchPushPublicKey,
  getCurrentPushSubscription,
  sendPushTestNotification,
  sendTestPushNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
};
