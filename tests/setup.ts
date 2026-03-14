import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Clear environment overrides that might interfere with tests
delete process.env.MONGODB_DB_NAME_OVERRIDE;
delete process.env.SAVE_SMOKE_EXPECTED_DATABASE_TARGET;
delete process.env.FANTAF1_EXPECTED_DATABASE_TARGET;
delete process.env.VITE_APP_LOCAL_NAME;

// Reset DOM after each test
afterEach(() => {
  cleanup();
});

// Mock fetch globally
global.fetch = vi.fn();
