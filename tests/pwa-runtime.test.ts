/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { bootstrapPwaRuntime as runtimeBootstrapPwaRuntime } from '../src/pwa/runtime';
import { bootstrapPwaRuntime as supportBootstrapPwaRuntime } from '../src/pwa/pwaSupport';

describe('pwa runtime module', () => {
  it('re-exports the pwa bootstrap helper', () => {
    expect(runtimeBootstrapPwaRuntime).toBe(supportBootstrapPwaRuntime);
  });
});
