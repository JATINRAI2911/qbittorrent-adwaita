import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Refresher } from '../../src/sync/refresher';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(task: (isCurrent: () => boolean) => Promise<void>, hidden = { value: false }) {
  let visible: (() => void) | undefined;
  const refresher = new Refresher(task, {
    intervalMs: 2000,
    isHidden: () => hidden.value,
    onVisible: (cb) => {
      visible = cb;
      return () => (visible = undefined);
    },
  });
  return { refresher, hidden, becomeVisible: () => visible?.() };
}

describe('Refresher', () => {
  it('runs at once, then every interval after the previous run finished', async () => {
    const task = vi.fn(async () => {});
    const { refresher } = setup(task);
    refresher.start();
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(task).toHaveBeenCalledTimes(2);
    refresher.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('never overlaps runs, and pokeNow runs early', async () => {
    let finish!: () => void;
    const task = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { refresher } = setup(task);
    refresher.start();
    refresher.pokeNow();
    expect(task).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    refresher.pokeNow();
    expect(task).toHaveBeenCalledTimes(2);
    refresher.stop();
  });

  it('tells a run started before a restart that it is stale', async () => {
    const seen: boolean[] = [];
    let finish!: () => void;
    const task = vi.fn((isCurrent: () => boolean) => new Promise<void>((resolve) => (finish = () => (seen.push(isCurrent()), resolve()))));
    const { refresher } = setup(task);
    refresher.start();
    const first = finish;
    refresher.start();
    first();
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toEqual([false]);
    expect(task).toHaveBeenCalledTimes(2);
    refresher.stop();
  });

  it('pauses while the page is hidden and resumes when it is visible again', async () => {
    const task = vi.fn(async () => {});
    const { refresher, hidden, becomeVisible } = setup(task);
    refresher.start();
    hidden.value = true;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(task).toHaveBeenCalledTimes(1);
    hidden.value = false;
    becomeVisible();
    expect(task).toHaveBeenCalledTimes(2);
    refresher.stop();
  });

  it('keeps going after a failing run', async () => {
    const task = vi.fn(async () => Promise.reject(new Error('boom')));
    const { refresher } = setup(task);
    refresher.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledTimes(2);
    refresher.stop();
  });
});
