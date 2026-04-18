import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import { createAddCommands } from '../../src/commands/add-commands';
import type { ToastInput } from '../../src/ui/adw/toast.svelte';
import { fakeAddApi } from '../fixtures/fake-add-api';
import { fakeDetailsApi } from '../fixtures/fake-details-api';
import { fakeTorrentApi } from '../fixtures/fake-api';

function setup() {
  const api = fakeAddApi();
  const torrents = fakeTorrentApi();
  const details = fakeDetailsApi();
  const toasts: ToastInput[] = [];
  const refresh = vi.fn();
  const commands = createAddCommands({ api, torrents, details, toast: { show: (t) => toasts.push(t) }, refresh, wait: async () => {} });
  return { api, torrents, details, toasts, refresh, commands };
}

describe('add command', () => {
  it('sends each request, names a single torrent, and refreshes the list', async () => {
    const { api, toasts, refresh, commands } = setup();
    await expect(commands.add([{ sources: { urls: ['magnet:?xt=urn:btih:aa'] }, options: {} }], ['Ubuntu'])).resolves.toBe(true);
    expect(api.add).toHaveBeenCalledTimes(1);
    expect(toasts.at(-1)).toEqual({ title: 'Added “Ubuntu”' });
    expect(refresh).toHaveBeenCalled();
  });

  it('counts several torrents, including pending magnets', async () => {
    const { api, toasts, commands } = setup();
    api.add.mockResolvedValueOnce({ success_count: 1, failure_count: 0, pending_count: 2, added_torrent_ids: ['a'] });
    await commands.add([{ sources: { urls: ['a', 'b', 'c'] }, options: {} }], ['a', 'b', 'c']);
    expect(toasts.at(-1)!.title).toBe('Added 3 torrents');
  });

  it('skips files and starts an uploaded torrent after adding it stopped', async () => {
    const { details, torrents, commands } = setup();
    await commands.add([{ sources: { files: [new File(['1'], 'a.torrent')] }, options: { stopped: true }, after: { hash: 'hh', skip: [0, 2], start: true } }], ['a']);
    expect(details.setFilePriority).toHaveBeenCalledWith('hh', [0, 2], 0);
    expect(torrents.start).toHaveBeenCalledWith(['hh']);
  });

  it('reports partial and total failures in plain words', async () => {
    const { api, toasts, commands } = setup();
    api.add.mockResolvedValueOnce({ success_count: 1, failure_count: 1, pending_count: 0, added_torrent_ids: ['a'] });
    await commands.add([{ sources: { urls: ['a', 'b'] }, options: {} }], ['a', 'b']);
    expect(toasts.at(-1)!.title).toBe('Added 1 torrent, 1 couldn’t be added');
    api.add.mockRejectedValueOnce(new ApiError('request', 409, 'Torrent file is not valid'));
    await expect(commands.add([{ sources: { urls: ['x'] }, options: {} }], ['x'])).resolves.toBe(false);
    expect(toasts.at(-1)!.title).toBe('Couldn’t add torrents: Torrent file is not valid');
  });

  it('retries the file selection until qBittorrent has registered the new torrent', async () => {
    const { details, torrents, toasts, commands } = setup();
    details.setFilePriority.mockRejectedValueOnce(new ApiError('request', 404, 'Not Found')).mockRejectedValueOnce(new ApiError('request', 404, 'Not Found'));
    await expect(commands.add([{ sources: { files: [new File(['1'], 'a.torrent')] }, options: { stopped: true }, after: { hash: 'hh', skip: [1], start: true } }], ['a'])).resolves.toBe(true);
    expect(details.setFilePriority).toHaveBeenCalledTimes(3);
    expect(torrents.start).toHaveBeenCalledWith(['hh']);
    expect(toasts.at(-1)!.title).toBe('Added “a”');
  });

  it('leaves the torrent stopped and says so when the file selection can’t be applied', async () => {
    const { details, torrents, toasts, refresh, commands } = setup();
    details.setFilePriority.mockRejectedValue(new ApiError('request', 404, 'Not Found'));
    await expect(commands.add([{ sources: { files: [new File(['1'], 'a.torrent')] }, options: { stopped: true }, after: { hash: 'hh', skip: [1], start: true } }], ['a'])).resolves.toBe(true);
    expect(torrents.start).not.toHaveBeenCalled();
    expect(toasts.at(-1)!.title).toBe('Added “a” stopped: couldn’t apply the file selection');
    expect(refresh).toHaveBeenCalled();
  });

  it('never names a torrent by its link before its metadata is known', async () => {
    const { toasts, commands } = setup();
    await commands.add([{ sources: { urls: ['https://t.example/dl?k=abc123'] }, options: {} }], [null]);
    expect(toasts.at(-1)!.title).toBe('Added 1 torrent');
  });
});
