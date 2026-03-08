/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const render = vi.fn();
const createRoot = vi.fn(() => ({ render }));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot,
  },
  createRoot,
}));

vi.mock('../src/App.tsx', () => ({
  default: () => null,
}));

describe('main entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    render.mockClear();
    createRoot.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts the React application into the root node', async () => {
    await import('../src/main.tsx');

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(render).toHaveBeenCalledTimes(1);
  });
});
