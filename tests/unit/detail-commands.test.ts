import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import type { TorrentFile } from '../../src/api/details';
import { createDetailCommands, type DetailCommandDeps } from '../../src/commands/detail-commands';
import type { ToastInput } from '../../src/ui/adw/toast.svelte';
import { fakeDetailsApi } from '../fixtures/fake-details-api';

function setup(overrides: Partial<DetailCommandDeps> = {}) {
  const api = fakeDetailsApi();
  const toasts: ToastInput[] = [];
  const deps: DetailCommandDeps = { api, toast: { show: (t) => toasts.push(t) }, refresh: vi.fn(), resync: vi.fn(), copyText: vi.fn(async () => {}), ...overrides };
  return { api, deps, toasts, commands: createDetailCommands(deps), last: () => toasts.at(-1) };
}

const file = (index: number, priority = 1): TorrentFile => ({ index, name: `f${index}`, size: 1, progress: 0, priority, piece_range: [0, 0], availability: 1 });

describe('file commands', () => {
  it('sets priorities optimistically and silently', async () => {
    const { api, commands, toasts } = setup();
    const files = [file(0), file(1), file(2)];
    await expect(commands.setPriority('h', files, [0, 2], 'skip')).resolves.toBe(true);
    expect(api.setFilePriority).toHaveBeenCalledWith('h', [0, 2], 0);
    expect(files.map((f) => f.priority)).toEqual([0, 1, 0]);
    expect(toasts).toEqual([]);
  });

  it('rolls a priority change back and explains a failure', async () => {
    const { api, commands, last, deps } = setup();
    api.setFilePriority.mockRejectedValueOnce(new ApiError('request', 409, "Torrent's metadata has not yet downloaded"));
    const files = [file(0, 6)];
    await expect(commands.setPriority('h', files, [0], 'normal')).resolves.toBe(false);
    expect(files[0]!.priority).toBe(6);
    expect(last()!.title).toBe("Couldn’t change file priority: Torrent's metadata has not yet downloaded");
    expect(deps.resync).toHaveBeenCalled();
  });

  it('renames files and folders by their last path segment, then refreshes', async () => {
    const { api, commands, deps, last } = setup();
    await commands.renamePath('h', { kind: 'file', path: 'Show/S01/E01.mkv' }, 'Pilot.mkv');
    expect(api.renameFile).toHaveBeenCalledWith('h', 'Show/S01/E01.mkv', 'Show/S01/Pilot.mkv');
    await commands.renamePath('h', { kind: 'folder', path: 'Show/S01' }, 'Season 1');
    expect(api.renameFolder).toHaveBeenCalledWith('h', 'Show/S01', 'Show/Season 1');
    expect(deps.refresh).toHaveBeenCalledTimes(2);
    expect(last()!.title).toBe('Renamed “S01” to “Season 1”');
  });
});

describe('tracker commands', () => {
  it('adds trackers keeping blank lines as tier separators', async () => {
    const { api, commands, last } = setup();
    await commands.addTrackers('h', 'udp://a:1\n\nudp://b:2');
    expect(api.addTrackers).toHaveBeenCalledWith('h', ['udp://a:1', '', 'udp://b:2']);
    expect(last()!.title).toBe('Added 2 trackers');
  });

  it('never puts a tracker URL in a toast', async () => {
    const { api, commands, toasts } = setup();
    const secret = 'https://t.example/a/0123456789abcdef0123456789abcdef/announce';
    await commands.editTracker('h', secret, secret.replace('announce', 'ann'));
    await commands.removeTracker('h', secret);
    api.removeTrackers.mockRejectedValueOnce(new ApiError('request', 400, 'Tracker not found'));
    await commands.removeTracker('h', secret);
    await commands.copyTracker(secret);
    expect(JSON.stringify(toasts)).not.toContain('0123456789abcdef');
    expect(toasts.map((t) => t.title)).toEqual(['Tracker updated', 'Removed tracker', 'Couldn’t remove the tracker: Tracker not found', 'Copied tracker URL']);
  });
});

describe('peer commands', () => {
  it('adds peers from any whitespace- or comma-separated list', async () => {
    const { api, commands, last } = setup();
    await commands.addPeers('h', '1.2.3.4:5, [::1]:6\n7.7.7.7:8');
    expect(api.addPeers).toHaveBeenCalledWith(['h'], ['1.2.3.4:5', '[::1]:6', '7.7.7.7:8']);
    expect(last()!.title).toBe('Added 3 peers');
  });

  it('bans and copies a peer without showing its address', async () => {
    const { api, commands, deps, toasts } = setup();
    await commands.banPeer('9.9.9.9:1');
    await commands.copyPeer('9.9.9.9:1');
    expect(api.banPeers).toHaveBeenCalledWith(['9.9.9.9:1']);
    expect(deps.copyText).toHaveBeenCalledWith('9.9.9.9:1');
    expect(JSON.stringify(toasts)).not.toContain('9.9.9.9');
  });
});

describe('web seed and comment commands', () => {
  it('adds, edits and removes web seeds', async () => {
    const { api, commands } = setup();
    await commands.addWebSeeds('h', 'https://a/x\nhttps://b/y');
    await commands.editWebSeed('h', 'https://a/x', 'https://c/x');
    await commands.removeWebSeed('h', 'https://c/x');
    expect(api.addWebSeeds).toHaveBeenCalledWith('h', ['https://a/x', 'https://b/y']);
    expect(api.editWebSeed).toHaveBeenCalledWith('h', 'https://a/x', 'https://c/x');
    expect(api.removeWebSeeds).toHaveBeenCalledWith('h', ['https://c/x']);
  });

  it('saves the comment', async () => {
    const { api, commands, last } = setup();
    await commands.setComment('h', 'hello');
    expect(api.setComment).toHaveBeenCalledWith(['h'], 'hello');
    expect(last()!.title).toBe('Comment saved');
  });
});
