import { serviceWorkerScriptUrl } from './pwaConstants';

function isServiceWorkerSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

async function registerServiceWorker(scriptUrl: string = serviceWorkerScriptUrl) {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(scriptUrl, { scope: '/' });
  } catch {
    return null;
  }
}

function isPushApiSupported() {
  return typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

async function bootstrapPwaRuntime() {
  await registerServiceWorker();
}

export {
  bootstrapPwaRuntime,
  isPushApiSupported,
  isServiceWorkerSupported,
  registerServiceWorker,
};
