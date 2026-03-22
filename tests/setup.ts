import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Clear environment overrides that might interfere with tests
delete process.env.MONGODB_DB_NAME_OVERRIDE;
delete process.env.SAVE_SMOKE_EXPECTED_DATABASE_TARGET;
delete process.env.FANTAF1_EXPECTED_DATABASE_TARGET;
delete process.env.VITE_APP_LOCAL_NAME;

function createDefaultMatchMedia() {
  return vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

class DefaultIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

function applyDefaultBrowserMocks() {
  if (typeof window === 'undefined') {
    return;
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createDefaultMatchMedia(),
  });

  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: DefaultIntersectionObserver,
  });
}

function resetGlobalFetchMock() {
  global.fetch = vi.fn();
}

applyDefaultBrowserMocks();
resetGlobalFetchMock();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
  applyDefaultBrowserMocks();
  resetGlobalFetchMock();
});
