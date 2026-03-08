import { describe, expect, it, vi } from 'vitest';
import { loadRuntimeEnv } from '../scripts/ui-responsive/diagnostics.mjs';

describe('responsive UI diagnostics env loading', () => {
  it('forces development mode for the local responsive stack even when the parent env is production', () => {
    const runtimeEnv = loadRuntimeEnv({
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://example.test/fantaf1_dev',
      },
      fsImpl: {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
      },
    });

    expect(runtimeEnv.NODE_ENV).toBe('development');
  });
});
