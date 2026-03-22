/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const render = vi.fn();
const createRoot = vi.fn(() => ({ render }));
const { bootstrapPwaRuntime } = vi.hoisted(() => ({
  bootstrapPwaRuntime: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot,
  },
  createRoot,
}));

vi.mock('../src/App.tsx', () => ({
  default: () => null,
}));

vi.mock('../src/pwa/runtime', () => ({
  bootstrapPwaRuntime,
}));

describe('main entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    render.mockClear();
    createRoot.mockClear();
    bootstrapPwaRuntime.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts the React application into the root node', async () => {
    await import('../src/main.tsx');

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(render).toHaveBeenCalledTimes(1);
    expect(bootstrapPwaRuntime).toHaveBeenCalledTimes(1);
  });
});
