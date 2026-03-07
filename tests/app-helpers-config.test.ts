/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';

describe('App helpers config fallback', () => {
  it('falls back to 3 participant slots when config is invalid', async () => {
    vi.resetModules();

    vi.doMock('../src/constants', async () => {
      const actual = await vi.importActual<typeof import('../src/constants')>('../src/constants');

      return {
        ...actual,
        appConfig: {
          ...actual.appConfig,
          participantSlots: 'invalid',
        },
      };
    });

    const { buildEmptyAppData } = await import('../src/utils/appHelpers');

    expect(buildEmptyAppData([]).users).toHaveLength(3);

    vi.doUnmock('../src/constants');
    vi.resetModules();
  });
});
