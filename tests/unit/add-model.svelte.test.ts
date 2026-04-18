import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import { AddModel, defaultsFromPreferences } from '../../src/features/add/add-model.svelte';
import { fakeAddApi, metadata } from '../fixtures/fake-add-api';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const HEX = 'ab'.repeat(20);
const magnet = (hash = HEX, name = 'Ubuntu') => `magnet:?xt=urn:btih:${hash}&dn=${name}`;

function setup(existing: string[] = []) {
  const api = fakeAddApi();
  const model = new AddModel({ api, has: (hash) => existing.includes(hash), pollMs: 1000 });
  return { api, model };
}

describe('AddModel items', () => {
  it('adds pasted sources once and reports invalid text', () => {
    const { model } = setup();
    model.addText(`${magnet()} ${magnet()} magnet:?dn=broken`);
    expect(model.items.map((i) => [i.kind, i.label, i.status])).toEqual([['magnet', 'Ubuntu', 'loading']]);
    expect(model.invalid).toEqual(['magnet:?dn=broken']);
    model.addText(magnet());
    expect(model.items).toHaveLength(1);
    model.dispose();
  });

  it('marks torrents already in the list as duplicates and leaves them out', () => {
    const { model } = setup([HEX]);
    model.addText(magnet());
    expect(model.items[0]!.status).toBe('duplicate');
    expect(model.addable).toEqual([]);
    model.dispose();
  });

  it('polls a magnet’s metadata until it arrives, then stops', async () => {
    const { api, model } = setup();
    api.fetchMetadata.mockResolvedValueOnce({ pending: true, hash: HEX }).mockResolvedValueOnce({ pending: false, metadata: metadata({ name: 'Ubuntu', files: [{ path: 'u.iso', length: 5 }] }) });
    model.addText(magnet());
    await vi.advanceTimersByTimeAsync(0);
    expect(model.items[0]!.status).toBe('waiting');
    await vi.advanceTimersByTimeAsync(1000);
    expect(model.items[0]!.status).toBe('ready');
    expect(model.items[0]!.metadata!.info.name).toBe('Ubuntu');
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.fetchMetadata).toHaveBeenCalledTimes(2);
    model.dispose();
  });

  it('keeps a magnet addable while metadata never arrives, and stops polling on dispose', async () => {
    const { api, model } = setup();
    model.addText(magnet());
    await vi.advanceTimersByTimeAsync(3000);
    expect(model.addable).toHaveLength(1);
    model.dispose();
    const calls = api.fetchMetadata.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.fetchMetadata.mock.calls.length).toBe(calls);
  });

  it('shows a metadata failure but keeps the item addable', async () => {
    const { api, model } = setup();
    api.fetchMetadata.mockRejectedValueOnce(new ApiError('request', 400, 'Unable to download the torrent'));
    model.addText('https://x.example/a.torrent');
    await vi.advanceTimersByTimeAsync(0);
    expect(model.items[0]).toMatchObject({ status: 'error', error: 'Unable to download the torrent' });
    expect(model.addable).toHaveLength(1);
    model.dispose();
  });

  it('parses dropped .torrent files, ignoring other files, and detects duplicates by hash', async () => {
    const { api, model } = setup([HEX]);
    api.parseMetadata.mockResolvedValueOnce([metadata({ name: 'a', hash: 'cd'.repeat(20) }), metadata({ name: 'b', hash: HEX })]);
    model.addFiles([new File(['1'], 'a.torrent'), new File(['2'], 'b.torrent'), new File(['3'], 'notes.txt')]);
    expect(model.items.map((i) => i.label)).toEqual(['a.torrent', 'b.torrent']);
    await vi.advanceTimersByTimeAsync(0);
    expect(model.items.map((i) => [i.label, i.status])).toEqual([
      ['a', 'ready'],
      ['b', 'duplicate'],
    ]);
    model.dispose();
  });

  it('removes items', () => {
    const { model } = setup();
    model.addText(magnet());
    model.remove(model.items[0]!.id);
    expect(model.items).toEqual([]);
    model.dispose();
  });
});

describe('AddModel file selection', () => {
  it('offers file selection only for one source with known metadata', async () => {
    const { api, model } = setup();
    api.fetchMetadata.mockResolvedValue({ pending: false, metadata: metadata({ files: [{ path: 'd/a', length: 1 }, { path: 'd/b', length: 1 }] }) });
    model.addText(magnet());
    await vi.advanceTimersByTimeAsync(0);
    expect(model.canSelectFiles).toBe(true);
    model.setSkipped([1], true);
    expect([...model.skipped]).toEqual([1]);
    model.addText(magnet('cd'.repeat(20), 'Other'));
    expect(model.canSelectFiles).toBe(false);
    model.dispose();
  });
});

describe('defaults', () => {
  it('reads add defaults from qBittorrent preferences', () => {
    expect(
      defaultsFromPreferences({
        save_path: '/dl',
        temp_path_enabled: true,
        temp_path: '/dl/tmp',
        auto_tmm_enabled: false,
        add_stopped_enabled: true,
        add_to_top_of_queue: false,
        torrent_content_layout: 'Subfolder',
        torrent_stop_condition: 'MetadataReceived',
      }),
    ).toEqual({ savePath: '/dl', useDownloadPath: true, downloadPath: '/dl/tmp', autoTMM: false, start: false, addToTop: false, contentLayout: 'Subfolder', stopCondition: 'MetadataReceived' });
    expect(defaultsFromPreferences({ torrent_content_layout: 'weird' })).toEqual({});
  });

  it('applies defaults without overwriting what the user already changed', () => {
    const { model } = setup();
    model.form.start = false;
    model.markEdited('start');
    model.applyDefaults({ start: true, savePath: '/dl' });
    expect([model.form.start, model.form.savePath]).toEqual([false, '/dl']);
    model.dispose();
  });
});

describe('AddModel polling', () => {
  it('gives up on a URL that keeps failing to download instead of hitting the tracker every second', async () => {
    const { api, model } = setup();
    model.addText('https://tracker.example/download.php?id=1&passkey=0123456789abcdef0123456789abcdef');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(model.items[0]).toMatchObject({ status: 'error', error: 'Couldn’t download the torrent file' });
    expect(api.fetchMetadata.mock.calls.length).toBeLessThanOrEqual(10);
    expect(model.addable).toHaveLength(1);
    model.dispose();
  });

  it('backs off while a magnet waits for peers, but keeps waiting', async () => {
    const { api, model } = setup();
    model.addText(magnet());
    await vi.advanceTimersByTimeAsync(60_000);
    expect(model.items[0]!.status).toBe('waiting');
    expect(api.fetchMetadata.mock.calls.length).toBeLessThanOrEqual(20);
    const calls = api.fetchMetadata.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.fetchMetadata.mock.calls.length).toBeGreaterThan(calls);
    model.dispose();
  });
});
