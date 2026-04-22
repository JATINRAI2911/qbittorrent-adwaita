import { afterEach, describe, expect, it, vi } from 'vitest';
import { appApi } from '../../src/api/app';
import { configureClient } from '../../src/api/client';
import { transferApi } from '../../src/api/transfer';

function capture() {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(''));
  configureClient({ fetch: fn as unknown as typeof fetch });
  return () => fn.mock.calls.map(([url, init]) => `${init?.method} ${url} ${init?.body}`);
}

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

describe('global endpoints', () => {
  it('sets the speed-limit mode with exactly 0 or 1 (5.2 treats any non-zero as on)', async () => {
    const calls = capture();
    await transferApi.setSpeedLimitsMode(true);
    await transferApi.setSpeedLimitsMode(false);
    expect(calls()).toEqual(['POST /api/v2/transfer/setSpeedLimitsMode mode=1', 'POST /api/v2/transfer/setSpeedLimitsMode mode=0']);
  });

  it('writes only the given preferences as one JSON field', async () => {
    const calls = capture();
    await appApi.setPreferences({ dl_limit: 1024, scheduler_enabled: true });
    expect(calls()).toEqual(['POST /api/v2/app/setPreferences json=%7B%22dl_limit%22%3A1024%2C%22scheduler_enabled%22%3Atrue%7D']);
  });
});
