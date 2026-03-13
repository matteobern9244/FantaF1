import { describe, expect, it, vi } from 'vitest';
import { ensureLocalAppStack } from '../scripts/ui-responsive/stack.mjs';
import { canSelectSprintWeekend, canSwitchWeekend } from '../scripts/ui-responsive/state-validation.mjs';

describe('responsive UI local stack bootstrap', () => {
  it('starts backend and frontend when the frontend is initially unreachable and stops them afterwards', async () => {
    const urlState = new Map([
      ['http://127.0.0.1:5173', { calls: 0, okAfter: 3 }],
      ['http://127.0.0.1:3001/api/health', { calls: 0, okAfter: 2 }],
      ['http://127.0.0.1:3001/api/session', { calls: 0, okAfter: 4 }],
      ['http://127.0.0.1:3001/api/data', { calls: 0, okAfter: 4 }],
      ['http://127.0.0.1:3001/api/drivers', { calls: 0, okAfter: 4 }],
      ['http://127.0.0.1:3001/api/calendar', { calls: 0, okAfter: 4 }],
    ]);
    const fetchImpl = vi.fn().mockImplementation(async (url) => {
      const state = urlState.get(url);
      if (!state) {
        throw new Error(`unexpected url ${url}`);
      }

      state.calls += 1;
      if (state.calls < state.okAfter) {
        throw new Error('offline');
      }

      return { ok: true };
    });
    const backendKill = vi.fn();
    const frontendKill = vi.fn();
    const spawnImpl = vi
      .fn()
      .mockReturnValueOnce({ killed: false, kill: backendKill })
      .mockReturnValueOnce({ killed: false, kill: frontendKill });

    const stack = await ensureLocalAppStack({
      frontendUrl: 'http://127.0.0.1:5173',
      backendCommand: 'node',
      backendArgs: ['server.js'],
      frontendCommand: 'npm',
      frontendArgs: ['run', 'dev:frontend'],
      fetchImpl,
      spawnImpl,
      sleepImpl: async () => {},
      timeoutMs: 1500,
      pollInterval: 10,
      cwd: '/tmp/fantaf1',
      env: {},
    });

    expect(stack.started).toBe(true);
    expect(spawnImpl).toHaveBeenNthCalledWith(
      1,
      'node',
      ['server.js'],
      expect.objectContaining({ cwd: '/tmp/fantaf1', stdio: 'ignore' }),
    );
    expect(spawnImpl).toHaveBeenNthCalledWith(
      2,
      'npm',
      ['run', 'dev:frontend'],
      expect.objectContaining({ cwd: '/tmp/fantaf1', stdio: 'ignore' }),
    );

    await stack.stop();

    expect(frontendKill).toHaveBeenCalledWith('SIGTERM');
    expect(backendKill).toHaveBeenCalledWith('SIGTERM');
  });

  it('reuses an already healthy frontend and backend without spawning child processes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const spawnImpl = vi.fn();

    const stack = await ensureLocalAppStack({
      frontendUrl: 'http://127.0.0.1:5173',
      backendUrl: 'http://127.0.0.1:3001/api/health',
      fetchImpl,
      spawnImpl,
      sleepImpl: async () => {},
      timeoutMs: 100,
      pollInterval: 10,
      cwd: '/tmp/fantaf1',
      env: {},
    });

    expect(stack.started).toBe(false);
    expect(spawnImpl).not.toHaveBeenCalled();

    await expect(stack.stop()).resolves.toBeUndefined();
  });

  it('fails fast when only one side of the local stack is reachable', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (url) => {
      if (url === 'http://127.0.0.1:5173') {
        return { ok: true };
      }

      throw new Error('offline');
    });

    await expect(
      ensureLocalAppStack({
        frontendUrl: 'http://127.0.0.1:5173',
        backendUrl: 'http://127.0.0.1:3001/api/health',
        fetchImpl,
        spawnImpl: vi.fn(),
        sleepImpl: async () => {},
        timeoutMs: 100,
        pollInterval: 10,
      }),
    ).rejects.toThrow(/stack locale parziale/i);
  });

  it('skips the weekend-switch scenario when fewer than two calendar cards are available', () => {
    expect(canSwitchWeekend({ selectedWeekend: { calendarCardCount: 0 } })).toBe(false);
    expect(canSwitchWeekend({ selectedWeekend: { calendarCardCount: 1 } })).toBe(false);
    expect(canSwitchWeekend({ selectedWeekend: { calendarCardCount: 2 } })).toBe(true);
  });

  it('skips the sprint scenario when no sprint weekends are available', () => {
    expect(canSelectSprintWeekend({ selectedWeekend: { sprintCardCount: 0 } })).toBe(false);
    expect(canSelectSprintWeekend({ selectedWeekend: { sprintCardCount: 1 } })).toBe(true);
  });
});
