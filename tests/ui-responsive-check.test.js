import { describe, expect, it, vi } from 'vitest';
import {
  canSelectSprintWeekend,
  canSwitchWeekend,
  ensureLocalAppStack,
} from '../scripts/ui-responsive-check.mjs';

describe('responsive UI local stack bootstrap', () => {
  it('starts backend and frontend when the frontend is initially unreachable and stops them afterwards', async () => {
    let fetchCalls = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      fetchCalls += 1;

      if (fetchCalls === 1) {
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
      pollIntervalMs: 10,
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

  it('reuses an already reachable frontend without spawning child processes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const spawnImpl = vi.fn();

    const stack = await ensureLocalAppStack({
      frontendUrl: 'http://127.0.0.1:5173',
      fetchImpl,
      spawnImpl,
      sleepImpl: async () => {},
      timeoutMs: 100,
      pollIntervalMs: 10,
      cwd: '/tmp/fantaf1',
      env: {},
    });

    expect(stack.started).toBe(false);
    expect(spawnImpl).not.toHaveBeenCalled();

    await expect(stack.stop()).resolves.toBeUndefined();
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
