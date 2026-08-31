import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import { DetailsModel } from '../../src/features/details/details.svelte';
import { fakeDetailsApi } from '../fixtures/fake-details-api';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const api = fakeDetailsApi();
  const hidden = { value: false };
  let visible: (() => void) | undefined;
  let now = 0;
  const model = new DetailsModel({
    api,
    isHidden: () => hidden.value,
    onVisible: (cb) => ((visible = cb), () => (visible = undefined)),
    now: () => now,
  });
  const advance = async (ms: number) => {
    now += ms;
    await vi.advanceTimersByTimeAsync(ms);
  };
  return { api, model, hidden, advance, becomeVisible: () => visible?.() };
}

describe('DetailsModel sheet states', () => {
  it('opens, minimizes to the bar, expands and closes', () => {
    const { model } = setup();
    expect(model.sheet).toBe('closed');
    model.open('h');
    expect([model.sheet, model.hash]).toEqual(['open', 'h']);
    model.minimize();
    expect(model.sheet).toBe('bar');
    model.expand();
    expect(model.sheet).toBe('open');
    model.close();
    expect([model.sheet, model.hash]).toEqual(['closed', null]);
    model.dispose();
  });

  it('follows another torrent without changing the sheet state, and ignores show() while closed', () => {
    const { model } = setup();
    model.show('x');
    expect(model.sheet).toBe('closed');
    model.open('a');
    model.minimize();
    model.show('b');
    expect([model.sheet, model.hash]).toEqual(['bar', 'b']);
    model.dispose();
  });
});

describe('DetailsModel polling', () => {
  it('polls only the visible tab of an open sheet, every 2 s, with pieces at most every 5 s', async () => {
    const { api, model, advance } = setup();
    api.properties.mockResolvedValue({ name: 'x' } as never);
    api.pieceStates.mockResolvedValue([2, 2, 0]);
    model.open('h');
    await advance(0);
    expect(api.properties).toHaveBeenCalledWith('h');
    expect(api.pieceStates).toHaveBeenCalledTimes(1);
    expect(model.properties).toEqual({ name: 'x' });
    expect(model.pieces).toEqual([2, 2, 0]);
    await advance(2000);
    expect(api.properties).toHaveBeenCalledTimes(2);
    expect(api.pieceStates).toHaveBeenCalledTimes(1);
    await advance(4000);
    expect(api.pieceStates).toHaveBeenCalledTimes(2);
    expect(api.files).not.toHaveBeenCalled();
    model.dispose();
  });

  it('switches what it polls with the tab', async () => {
    const { api, model, advance } = setup();
    api.files.mockResolvedValue([{ index: 0, name: 'a', size: 1, progress: 1, priority: 1, piece_range: [0, 0], availability: 1 }]);
    api.trackers.mockResolvedValue([{ url: 'u', tier: 0, status: 2, msg: '', num_seeds: 1, num_leeches: 0, num_peers: 0, num_downloaded: 0 }]);
    api.webseeds.mockResolvedValue([{ url: 'https://w' }]);
    model.open('h');
    model.setTab('files');
    await advance(0);
    expect(model.files).toHaveLength(1);
    model.setTab('trackers');
    await advance(0);
    expect(model.trackers).toHaveLength(1);
    model.setTab('sources');
    await advance(0);
    expect(model.webseeds).toEqual([{ url: 'https://w' }]);
    model.dispose();
  });

  it('merges peers by rid', async () => {
    const { api, model, advance } = setup();
    api.peers
      .mockResolvedValueOnce({ rid: 5, full_update: true, peers: { 'a:1': { client: 'qB' }, 'b:2': { client: 'Tr' } } })
      .mockResolvedValueOnce({ rid: 6, peers_removed: ['b:2'] });
    model.open('h');
    model.setTab('peers');
    await advance(0);
    expect([...model.peers.keys()]).toEqual(['a:1', 'b:2']);
    expect(model.peersLoaded).toBe(true);
    await advance(2000);
    expect(api.peers).toHaveBeenLastCalledWith('h', 5);
    expect([...model.peers.keys()]).toEqual(['a:1']);
    model.dispose();
  });

  it('stops polling in the bar and when closed, and pauses while the page is hidden', async () => {
    const { api, model, hidden, advance, becomeVisible } = setup();
    model.open('h');
    await advance(0);
    model.minimize();
    await advance(10_000);
    expect(api.properties).toHaveBeenCalledTimes(1);
    model.expand();
    await advance(0);
    expect(api.properties).toHaveBeenCalledTimes(2);
    hidden.value = true;
    await advance(10_000);
    expect(api.properties).toHaveBeenCalledTimes(2);
    hidden.value = false;
    becomeVisible();
    await advance(0);
    expect(api.properties).toHaveBeenCalledTimes(3);
    model.close();
    await advance(10_000);
    expect(api.properties).toHaveBeenCalledTimes(3);
    model.dispose();
  });

  it('asks for all peers again (rid 0) after switching torrents', async () => {
    const { api, model, advance } = setup();
    api.peers.mockResolvedValue({ rid: 9, full_update: true, peers: {} });
    model.open('a');
    model.setTab('peers');
    await advance(0);
    await advance(2000);
    expect(api.peers).toHaveBeenLastCalledWith('a', 9);
    model.show('b');
    await advance(500);
    expect(api.peers).toHaveBeenLastCalledWith('b', 0);
    model.dispose();
  });

  it('never lands a late response for the previous tab', async () => {
    const { api, model, advance } = setup();
    let resolveFiles!: (value: never) => void;
    api.files.mockImplementationOnce(() => new Promise((r) => (resolveFiles = r)));
    model.open('h');
    model.setTab('files');
    await advance(0);
    model.setTab('trackers');
    await advance(0);
    resolveFiles([{ index: 0, name: 'late.bin' }] as never);
    await advance(0);
    expect(model.files).toBeNull();
    model.dispose();
  });

  it('waits for arrow keys to settle before fetching another torrent', async () => {
    const { api, model, advance } = setup();
    model.open('a');
    await advance(0);
    expect(api.properties).toHaveBeenCalledTimes(1);
    model.show('b');
    model.show('c');
    model.show('d');
    expect(model.hash).toBe('d'); // the sheet follows at once…
    await advance(100);
    expect(api.properties).toHaveBeenCalledTimes(1); // …but nothing is fetched mid-run
    await advance(200);
    expect(api.properties).toHaveBeenCalledTimes(2);
    expect(api.properties).toHaveBeenLastCalledWith('d');
    model.dispose();
  });

  it('stops polling while hidden by selection mode', async () => {
    const { api, model, advance } = setup();
    model.open('h');
    await advance(0);
    model.setSuspended(true);
    await advance(10_000);
    expect(api.properties).toHaveBeenCalledTimes(1);
    model.setSuspended(false);
    await advance(0);
    expect(api.properties).toHaveBeenCalledTimes(2);
    model.dispose();
  });

  it('never lands a late response for a previous torrent or tab', async () => {
    const { api, model, advance } = setup();
    let resolveOld!: (value: never) => void;
    api.properties.mockImplementationOnce(() => new Promise((r) => (resolveOld = r))).mockResolvedValue({ name: 'new' } as never);
    model.open('old');
    model.open('new');
    await advance(0);
    resolveOld({ name: 'old' } as never);
    await advance(0);
    expect(model.properties).toEqual({ name: 'new' });
    model.dispose();
  });

  it('keeps the last data and reports a plain error when a poll fails', async () => {
    const { api, model, advance } = setup();
    api.trackers.mockResolvedValueOnce([{ url: 'u', tier: 0, status: 2, msg: '', num_seeds: 1, num_leeches: 0, num_peers: 0, num_downloaded: 0 }]).mockRejectedValueOnce(new ApiError('network', 0, 'x'));
    model.open('h');
    model.setTab('trackers');
    await advance(0);
    await advance(2000);
    expect(model.trackers).toHaveLength(1);
    expect(model.error).toBe('qBittorrent is unreachable');
    await advance(2000);
    expect(model.error).toBeNull();
    model.dispose();
  });

  it('clears the old torrent’s data when it switches torrents', async () => {
    const { api, model, advance } = setup();
    api.properties.mockResolvedValue({ name: 'a' } as never);
    model.open('a');
    await advance(0);
    api.properties.mockImplementation(() => new Promise(() => {}));
    model.show('b');
    expect(model.properties).toBeNull();
    model.dispose();
  });

  it('drops a files response that was requested before a priority change', async () => {
    const { api, model, advance } = setup();
    const stale = [{ index: 0, name: 'a', size: 1, progress: 1, priority: 1, piece_range: [0, 0] as [number, number], availability: 1 }];
    let resolveStale!: (value: typeof stale) => void;
    api.files.mockImplementationOnce(() => new Promise((r) => (resolveStale = r))).mockResolvedValue([{ ...stale[0]!, priority: 6 }]);
    model.open('h');
    model.setTab('files');
    await advance(0);
    model.markFilesChanged();
    resolveStale(stale);
    await advance(0);
    expect(model.files).toBeNull();
    await advance(2000);
    expect(model.files![0]!.priority).toBe(6);
    model.dispose();
  });
});
