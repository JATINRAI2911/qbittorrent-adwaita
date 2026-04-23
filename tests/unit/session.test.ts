import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import type { MaindataResponse } from '../../src/api/types';
import { Session, type SessionDeps } from '../../src/state/session.svelte';

const full: MaindataResponse = {
  rid: 1,
  full_update: true,
  torrents: { aaa: { name: 'ubuntu.iso', state: 'downloading' }, bbb: { name: 'debian.iso', state: 'stalledUP', progress: 1 } },
  server_state: { dl_info_speed: 10 },
};

function deps(overrides: Partial<SessionDeps> = {}): SessionDeps {
  return {
    login: vi.fn(async () => 'ok' as const),
    logout: vi.fn(async () => {}),
    maindata: vi.fn(async () => full),
    isHidden: () => false,
    onVisible: () => () => {},
    ...overrides,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Session', () => {
  it('records a speed sample on every sync', async () => {
    const session = new Session(deps());
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.speeds.samples).toEqual([{ t: Date.now(), dl: 10, ul: 0 }]);
    session.stop();
  });

  it('goes online and fills the stores after the first successful poll', async () => {
    const session = new Session(deps());
    expect(session.connection).toBe('starting');
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.connection).toBe('online');
    expect(session.loaded).toBe(true);
    expect(session.torrents.size).toBe(2);
    expect(session.server.dl_info_speed).toBe(10);
    session.stop();
  });

  it('asks for login when the server answers 403', async () => {
    const session = new Session(deps({ maindata: vi.fn(async () => Promise.reject(new ApiError('auth', 403, 'Forbidden'))) }));
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.connection).toBe('login');
    expect(session.loaded).toBe(false);
  });

  it('shows offline with a countdown and recovers on the next successful poll', async () => {
    const maindata = vi
      .fn<(rid: number) => Promise<MaindataResponse>>()
      .mockRejectedValueOnce(new ApiError('network', 0, 'down'))
      .mockResolvedValue(full);
    const session = new Session(deps({ maindata }));
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.connection).toBe('offline');
    expect(session.retryIn).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(session.connection).toBe('online');
    session.stop();
  });

  it('keeps the list when the session expires mid-use, then fully resyncs after login', async () => {
    const maindata = vi
      .fn<(rid: number) => Promise<MaindataResponse>>()
      .mockResolvedValueOnce(full)
      .mockRejectedValueOnce(new ApiError('auth', 403, 'Forbidden'))
      .mockResolvedValue({ ...full, rid: 5 });
    const session = new Session(deps({ maindata }));
    session.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(session.connection).toBe('login');
    expect(session.torrents.size).toBe(2);

    await expect(session.login('admin', 'secret')).resolves.toBe('ok');
    await vi.advanceTimersByTimeAsync(0);
    expect(maindata).toHaveBeenLastCalledWith(0);
    expect(session.connection).toBe('online');
    session.stop();
  });

  it('reports invalid credentials, bans and network failures from login without going online', async () => {
    const login = vi
      .fn<SessionDeps['login']>()
      .mockResolvedValueOnce('invalid')
      .mockResolvedValueOnce('banned')
      .mockRejectedValueOnce(new ApiError('network', 0, 'down'));
    const session = new Session(deps({ login, maindata: vi.fn(async () => Promise.reject(new ApiError('auth', 403, ''))) }));
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    await expect(session.login('a', 'b')).resolves.toBe('invalid');
    await expect(session.login('a', 'b')).resolves.toBe('banned');
    await expect(session.login('a', 'b')).resolves.toBe('network');
    expect(session.connection).toBe('login');
  });

  it('requests a full resync (rid 0) after a desync', async () => {
    const maindata = vi
      .fn<(rid: number) => Promise<MaindataResponse>>()
      .mockResolvedValueOnce(full)
      .mockResolvedValueOnce({ rid: 2, torrents: { zzz: { dlspeed: 1 } } })
      .mockResolvedValue({ ...full, rid: 3 });
    const session = new Session(deps({ maindata }));
    session.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(maindata.mock.calls.map((c) => c[0])).toEqual([0, 1, 0]);
    session.stop();
  });

  it('polls immediately when the tab becomes visible again', async () => {
    let visible!: () => void;
    const maindata = vi.fn(async () => full);
    const session = new Session(deps({ maindata, onVisible: (cb) => ((visible = cb), () => {}) }));
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    visible();
    await vi.advanceTimersByTimeAsync(0);
    expect(maindata).toHaveBeenCalledTimes(2);
    session.stop();
  });

  it('forgets torrents removed locally', async () => {
    const session = new Session(deps());
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    session.forget(['aaa']);
    expect([...session.torrents.keys()]).toEqual(['bbb']);
    session.stop();
  });

  it('resyncs from scratch on request', async () => {
    const maindata = vi.fn(async (_rid: number) => full);
    const session = new Session(deps({ maindata }));
    session.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(session.rid).toBe(1);
    session.resync();
    await vi.advanceTimersByTimeAsync(0);
    expect(maindata).toHaveBeenLastCalledWith(0);
    session.stop();
  });
});
