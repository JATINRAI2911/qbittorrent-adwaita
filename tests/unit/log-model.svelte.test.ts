import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogMessage } from '../../src/api/log';
import { filterMessages, LogModel } from '../../src/features/tools/log-model.svelte';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const msg = (id: number, type = 2, message = `message ${id}`): LogMessage => ({ id, type, message, timestamp: 1_790_000_000 + id });

function setup(pages: LogMessage[][], options: { cap?: number; hidden?: () => boolean } = {}) {
  let visible: (() => void) | null = null;
  const fetch = vi.fn(async (lastId: number) => (pages.shift() ?? []).filter((m) => m.id > lastId));
  const model = new LogModel<LogMessage>({
    fetch,
    isHidden: options.hidden ?? (() => false),
    onVisible: (callback) => {
      visible = callback;
      return () => (visible = null);
    },
    pollMs: 2000,
    cap: options.cap,
  });
  return { fetch, model, becomeVisible: () => visible?.() };
}

describe('LogModel', () => {
  it('loads everything, then only what is newer than the last id', async () => {
    const { fetch, model } = setup([[msg(0), msg(1)], [msg(2)]]);
    model.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(model.entries.map((m) => m.id)).toEqual([0, 1]);
    expect(fetch).toHaveBeenLastCalledWith(-1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenLastCalledWith(1);
    expect(model.entries.map((m) => m.id)).toEqual([0, 1, 2]);
    model.stop();
  });

  it('keeps memory bounded by dropping the oldest entries', async () => {
    const { model } = setup([[msg(0), msg(1), msg(2)], [msg(3), msg(4)]], { cap: 3 });
    model.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(model.entries.map((m) => m.id)).toEqual([2, 3, 4]);
    model.stop();
  });

  it('stops polling when stopped, and pauses while the page is hidden', async () => {
    let hidden = false;
    // The second page is the server's answer on return: it still has entry 0 (no restart).
    const { fetch, model, becomeVisible } = setup([[msg(0)], [msg(0)]], { hidden: () => hidden });
    model.start();
    await vi.advanceTimersByTimeAsync(0);
    hidden = true;
    await vi.advanceTimersByTimeAsync(10_000);
    const whileHidden = fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch.mock.calls.length).toBe(whileHidden);
    hidden = false;
    becomeVisible();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch.mock.calls.length).toBe(whileHidden + 1);
    model.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetch.mock.calls.length).toBe(whileHidden + 1);
  });

  it('shows why it can’t load, and recovers on the next poll', async () => {
    const { fetch, model } = setup([]);
    fetch.mockRejectedValueOnce(new Error('offline'));
    model.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(model.error).toBe('offline');
    await vi.advanceTimersByTimeAsync(2000);
    expect(model.error).toBeNull();
    model.stop();
  });
});

describe('filterMessages', () => {
  const entries = [msg(0, 1, 'qBittorrent v5.2.0 started'), msg(1, 2, 'UPnP on'), msg(2, 4, 'Tracker error: timed out'), msg(3, 8, 'File error: no space left')];

  it('filters by level: info covers normal and info messages', () => {
    expect(filterMessages(entries, 'all', '').map((m) => m.id)).toEqual([0, 1, 2, 3]);
    expect(filterMessages(entries, 'info', '').map((m) => m.id)).toEqual([0, 1]);
    expect(filterMessages(entries, 'warning', '').map((m) => m.id)).toEqual([2]);
    expect(filterMessages(entries, 'critical', '').map((m) => m.id)).toEqual([3]);
  });

  it('searches every word, case-insensitively', () => {
    expect(filterMessages(entries, 'all', 'ERROR space').map((m) => m.id)).toEqual([3]);
  });
});

describe('LogModel after qBittorrent restarts', () => {
  // A fake server: ids restart at 0 when it restarts, like qBittorrent's log.
  function server() {
    let log: LogMessage[] = [msg(0), msg(1), msg(2)];
    let down = false;
    const fetch = vi.fn(async (lastId: number) => {
      if (down) throw new TypeError('Failed to fetch');
      return log.filter((m) => m.id > lastId);
    });
    const model = new LogModel<LogMessage>({ fetch, isHidden: () => false, onVisible: () => () => {}, pollMs: 2000 });
    return {
      model,
      fetch,
      restart(fresh: LogMessage[]) {
        log = fresh;
      },
      setDown(value: boolean) {
        down = value;
      },
    };
  }

  it('starts over when the connection comes back to a restarted server', async () => {
    const s = server();
    s.model.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(s.model.entries.map((m) => m.id)).toEqual([0, 1, 2]);
    s.setDown(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.model.error).not.toBeNull();
    s.restart([msg(0, 2, 'qBittorrent v5.2.0 started'), msg(1, 2, 'Web UI: Now listening')]);
    s.setDown(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.model.entries.map((m) => m.message)).toEqual(['qBittorrent v5.2.0 started', 'Web UI: Now listening']);
    expect(s.model.resets).toBe(1); // the dialog clears its selection on this
    s.restart([msg(0, 2, 'qBittorrent v5.2.0 started'), msg(1, 2, 'Web UI: Now listening'), msg(2, 2, 'later')]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.model.entries.map((m) => m.id)).toEqual([0, 1, 2]);
    s.model.stop();
  });

  it('keeps what it has when the server was only unreachable for a moment', async () => {
    const s = server();
    s.model.start();
    await vi.advanceTimersByTimeAsync(0);
    s.setDown(true);
    await vi.advanceTimersByTimeAsync(2000);
    s.setDown(false);
    s.restart([msg(0), msg(1), msg(2), msg(3)]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.model.entries.map((m) => m.id)).toEqual([0, 1, 2, 3]);
    s.model.stop();
  });
});

