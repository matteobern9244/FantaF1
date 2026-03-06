import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Reset DOM after each test
afterEach(() => {
  cleanup();
});

// Mock fetch globally
global.fetch = vi.fn();
