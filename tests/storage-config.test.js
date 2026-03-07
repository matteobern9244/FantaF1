import { describe, expect, it, vi } from 'vitest';

describe('storage config fallback', () => {
  it('falls back to 3 participant slots when backend config is invalid', async () => {
    vi.resetModules();

    vi.doMock('../backend/config.js', async () => {
      const actual = await vi.importActual<typeof import('../backend/config.js')>('../backend/config.js');

      return {
        ...actual,
        appConfig: {
          ...actual.appConfig,
          participantSlots: 'invalid',
        },
      };
    });

    const { sanitizeAppData } = await import('../backend/storage.js');

    expect(sanitizeAppData({}).users).toHaveLength(3);

    vi.doUnmock('../backend/config.js');
    vi.resetModules();
  });
});
