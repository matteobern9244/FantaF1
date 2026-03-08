import { describe, expect, it } from 'vitest';
import { backendText } from '../backend/text.js';

describe('backend text constants', () => {
  it('exposes centralized health, auth and sync text', () => {
    expect(backendText.health.okStatus).toBe('ok');
    expect(backendText.auth.invalidPassword).toBe('Invalid password');
    expect(backendText.sync.startBackground).toBe('[Sync] Starting background synchronization...');
  });
});
