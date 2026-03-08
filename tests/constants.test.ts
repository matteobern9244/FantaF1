import { afterEach, describe, expect, it, vi } from 'vitest';

describe('constants module', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the configured local app name when provided', async () => {
    vi.stubEnv('VITE_APP_LOCAL_NAME', 'FantaF1 Locale');

    const constants = await import('../src/constants');

    expect(constants.visibleAppTitle).toBe('FantaF1 Locale');
    expect(constants.appConfig.runtime.displayTitle).toBe('FantaF1 Locale');
    expect(constants.resolveVisibleAppTitle('  FantaF1 Locale  ', constants.genericAppTitle)).toBe('FantaF1 Locale');
  });

  it('falls back to the generic app title when no local name is provided', async () => {
    vi.stubEnv('VITE_APP_LOCAL_NAME', '   ');

    const constants = await import('../src/constants');

    expect(constants.visibleAppTitle).toBe(constants.genericAppTitle);
    expect(constants.appConfig.runtime.displayTitle).toBe(constants.genericAppTitle);
    expect(constants.resolveVisibleAppTitle('', constants.genericAppTitle)).toBe(constants.genericAppTitle);
    expect(constants.resolveVisibleAppTitle(undefined, constants.genericAppTitle)).toBe(constants.genericAppTitle);
  });

  it('exposes centralized frontend runtime text groups', async () => {
    const { appText } = await import('../src/uiText');

    expect(appText.shell.loadingMessage).toBe('Preparazione dei box...');
    expect(appText.panels.publicGuide.title).toBe('Come funziona');
    expect(appText.panels.weekendPulseHero.availability.complete).toBe('Completi');
  });
});
