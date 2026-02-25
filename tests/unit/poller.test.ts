import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import type { MaindataResponse } from '../../src/api/types';
import { Poller, type PollerOptions } from '../../src/sync/poller';

function setup(overrides: Partial<PollerOptions> = {}) {
  const options = {
    fetch: vi.fn(async (): Promise<MaindataResponse> => ({ rid: 1 })),
    apply: vi.fn(),
    isHidden: vi.fn(() => false),
    onOnline: vi.fn(),
    onAuthLost: vi.fn(),
    onOffline: vi.fn(),
    ...overrides,
  };
  return { options, poller: new Poller(options) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Poller', () => {
  it('fetches immediately on start, applies the result and polls again after 1 s', async () => {
    const { options, poller } = setup();
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(options.fetch).toHaveBeenCalledTimes(1);
    expect(options.apply).toHaveBeenCalledWith({ rid: 1 });
    expect(options.onOnline).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(999);
    expect(options.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(options.fetch).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('slows to 5 s while the tab is hidden', async () => {
    const { options, poller } = setup({ isHidden: vi.fn(() => true) });
    poller.start();
    await vi.advanceTimersByTimeAsync(4999);
    expect(options.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(options.fetch).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('never has two requests in flight, even when a request outlives the interval', async () => {
    let resolve!: (value: MaindataResponse) => void;
    const fetch = vi.fn(() => new Promise<MaindataResponse>((r) => (resolve = r)));
    const { poller } = setup({ fetch });
    poller.start();
    poller.pokeNow();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve({ rid: 2 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('backs off 1, 2, 4 s on network errors and resets after a success', async () => {
    const fetch = vi
      .fn<() => Promise<MaindataResponse>>()
      .mockRejectedValueOnce(new ApiError('network', 0, 'down'))
      .mockRejectedValueOnce(new ApiError('timeout', 0, 'slow'))
      .mockRejectedValueOnce(new ApiError('server', 502, 'bad gateway'))
      .mockResolvedValue({ rid: 1 });
    const { options, poller } = setup({ fetch });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(options.onOffline).toHaveBeenLastCalledWith(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.onOffline).toHaveBeenLastCalledWith(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(options.onOffline).toHaveBeenLastCalledWith(4);
    await vi.advanceTimersByTimeAsync(4000);
    expect(options.onOnline).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(4);
    poller.stop();
  });

  it('stops and reports auth loss on 403', async () => {
    const fetch = vi.fn(async (): Promise<MaindataResponse> => {
      throw new ApiError('auth', 403, 'Forbidden');
    });
    const { options, poller } = setup({ fetch });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(options.onAuthLost).toHaveBeenCalledTimes(1);
    expect(poller.running).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('ignores a response that arrives after stop()', async () => {
    let resolve!: (value: MaindataResponse) => void;
    const { options, poller } = setup({ fetch: vi.fn(() => new Promise<MaindataResponse>((r) => (resolve = r))) });
    poller.start();
    poller.stop();
    resolve({ rid: 9 });
    await vi.advanceTimersByTimeAsync(0);
    expect(options.apply).not.toHaveBeenCalled();
  });

  it('pokeNow polls immediately instead of waiting for the timer', async () => {
    const { options, poller } = setup();
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.pokeNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(options.fetch).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('keeps polling (without going offline) if apply throws a programming error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { options, poller } = setup({
      apply: vi.fn(() => {
        throw new TypeError('bug');
      }),
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.onOffline).not.toHaveBeenCalled();
    expect(options.fetch).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalled();
    poller.stop();
    error.mockRestore();
  });

  it('ignores a stale response after stop→start and polls again immediately', async () => {
    const resolvers: ((value: MaindataResponse) => void)[] = [];
    const fetch = vi.fn(() => new Promise<MaindataResponse>((r) => resolvers.push(r)));
    const { options, poller } = setup({ fetch });
    poller.start();
    poller.stop();
    poller.start();
    expect(fetch).toHaveBeenCalledTimes(2);
    resolvers[0]!({ rid: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(options.apply).not.toHaveBeenCalled();
    resolvers[1]!({ rid: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(options.apply).toHaveBeenCalledWith({ rid: 2 });
    poller.stop();
  });
});
