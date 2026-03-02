import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import { createTorrentCommands, type CommandDeps } from '../../src/commands/torrent-commands';
import type { ToastInput } from '../../src/ui/adw/toast.svelte';
import { fakeTorrentApi } from '../fixtures/fake-api';
import { makeTorrent } from '../fixtures/torrents';

function setup(overrides: Partial<CommandDeps> = {}) {
  const api = fakeTorrentApi();
  const toasts: ToastInput[] = [];
  const deps: CommandDeps = {
    api,
    toast: { show: (t) => toasts.push(t) },
    forget: vi.fn(),
    resync: vi.fn(),
    copyText: vi.fn(async () => {}),
    download: vi.fn(),
    ...overrides,
  };
  return { api, toasts, deps, commands: createTorrentCommands(deps), last: () => toasts.at(-1)! };
}

describe('start and stop', () => {
  it('starts only stopped torrents, optimistically, and undo stops them again', async () => {
    const { api, commands, last } = setup();
    const stopped = makeTorrent({ name: 'ubuntu.iso', state: 'stoppedDL', progress: 0.5 });
    const running = makeTorrent({ state: 'downloading' });
    await expect(commands.start([stopped, running])).resolves.toBe(true);
    expect(api.start).toHaveBeenCalledWith([stopped.hash]);
    expect(stopped.state).toBe('downloading');
    expect(last().title).toBe('Started “ubuntu.iso”');

    last().undo!();
    await vi.waitFor(() => expect(api.stop).toHaveBeenCalledWith([stopped.hash]));
    expect(stopped.state).toBe('stoppedDL');
  });

  it('rolls back and explains when the server refuses', async () => {
    const { api, commands, last } = setup();
    api.stop.mockRejectedValueOnce(new ApiError('request', 409, 'Torrent is not ready'));
    const t = makeTorrent({ state: 'uploading', progress: 1, upspeed: 500 });
    await expect(commands.stop([t])).resolves.toBe(false);
    expect(t).toMatchObject({ state: 'uploading', upspeed: 500 });
    expect(last()).toEqual({ title: 'Couldn’t stop: Torrent is not ready' });
  });

  it('says the server is unreachable on network errors', async () => {
    const { api, commands, last } = setup();
    api.stop.mockRejectedValueOnce(new ApiError('network', 0, 'Failed to fetch'));
    await commands.stop([makeTorrent({ state: 'downloading' })]);
    expect(last().title).toBe('Couldn’t stop: qBittorrent is unreachable');
  });

  it('toggle stops when anything is running, otherwise starts', async () => {
    const { api, commands } = setup();
    await commands.toggle([makeTorrent({ state: 'stoppedDL' }), makeTorrent({ state: 'downloading' })]);
    expect(api.stop).toHaveBeenCalled();
    await commands.toggle([makeTorrent({ state: 'stoppedUP', progress: 1 })]);
    expect(api.start).toHaveBeenCalled();
  });

  it('does nothing when there is nothing to change', async () => {
    const { api, commands, toasts } = setup();
    await expect(commands.start([makeTorrent({ state: 'downloading' })])).resolves.toBe(false);
    expect(api.start).not.toHaveBeenCalled();
    expect(toasts).toHaveLength(0);
  });
});

describe('rollback against newer server data', () => {
  it('keeps a value the server sent while the request was in flight, and asks for a resync', async () => {
    const { api, commands, deps } = setup();
    const t = makeTorrent({ category: 'Films' });
    let fail!: (error: unknown) => void;
    api.setCategory.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => (fail = reject)));
    const done = commands.setCategory([t], 'ISOs');
    expect(t.category).toBe('ISOs');
    t.category = 'Archive'; // a sync tick lands with what the server now has
    fail(new ApiError('timeout', 0, 'Request timed out'));
    await expect(done).resolves.toBe(false);
    expect(t.category).toBe('Archive');
    expect(deps.resync).toHaveBeenCalledTimes(1);
  });

  it('still restores untouched fields and resyncs after a plain rejection', async () => {
    const { api, commands, deps } = setup();
    api.stop.mockRejectedValueOnce(new ApiError('request', 409, 'nope'));
    const t = makeTorrent({ state: 'uploading', progress: 1 });
    await commands.stop([t]);
    expect(t.state).toBe('uploading');
    expect(deps.resync).toHaveBeenCalledTimes(1);
  });
});

describe('torrents that need attention', () => {
  it('starts error and missing-files torrents without faking a state the server will not report', async () => {
    const { api, commands } = setup();
    const missing = makeTorrent({ state: 'missingFiles' });
    const failed = makeTorrent({ state: 'error' });
    await commands.toggle([missing, failed]);
    expect(api.start).toHaveBeenCalledWith([missing.hash, failed.hash]);
    expect(api.stop).not.toHaveBeenCalled();
    expect([missing.state, failed.state]).toEqual(['missingFiles', 'error']);
  });
});

describe('force start', () => {
  it('undo stops torrents that were stopped, and un-forces ones that were running', async () => {
    // qBittorrent's setForceStart(false) starts a torrent in auto-managed mode; it never stops it.
    const { api, commands, last } = setup();
    const stopped = makeTorrent({ state: 'stoppedDL', progress: 0.3 });
    const running = makeTorrent({ state: 'downloading' });
    await commands.forceStart([stopped, running]);
    expect(api.setForceStart).toHaveBeenCalledWith([stopped.hash, running.hash], true);
    last().undo!();
    await vi.waitFor(() => expect(api.stop).toHaveBeenCalledWith([stopped.hash]));
    expect(api.setForceStart).toHaveBeenCalledWith([running.hash], false);
    expect(api.setForceStart).not.toHaveBeenCalledWith(expect.arrayContaining([stopped.hash]), false);
    expect([stopped.state, running.state]).toEqual(['stoppedDL', 'downloading']);
  });
});

describe('categories and tags', () => {
  it('undo restores each torrent to its own previous category', async () => {
    const { api, commands, last } = setup();
    const a = makeTorrent({ category: 'Films' });
    const b = makeTorrent({ category: '' });
    await commands.setCategory([a, b], 'ISOs');
    expect(api.setCategory).toHaveBeenCalledWith([a.hash, b.hash], 'ISOs');
    expect(last().title).toBe('Moved 2 torrents to “ISOs”');
    last().undo!();
    await vi.waitFor(() => expect(api.setCategory).toHaveBeenCalledTimes(3));
    expect(api.setCategory).toHaveBeenCalledWith([a.hash], 'Films');
    expect(api.setCategory).toHaveBeenCalledWith([b.hash], '');
    expect([a.category, b.category]).toEqual(['Films', '']);
  });

  it('adds a tag only to torrents missing it, and removes it when all have it', async () => {
    const { api, commands } = setup();
    const tagged = makeTorrent({ tags: 'keep' });
    const bare = makeTorrent({ tags: '' });
    await commands.toggleTag([tagged, bare], 'keep');
    expect(api.addTags).toHaveBeenCalledWith([bare.hash], ['keep']);
    expect(bare.tags).toBe('keep');
    await commands.toggleTag([tagged, bare], 'keep');
    expect(api.removeTags).toHaveBeenCalledWith([tagged.hash, bare.hash], ['keep']);
    expect([tagged.tags, bare.tags]).toEqual(['', '']);
  });
});

describe('options', () => {
  it('toggles sequential download only where the value differs, and undo toggles them back', async () => {
    const { api, commands, last } = setup();
    const on = makeTorrent({ seq_dl: true });
    const off = makeTorrent({ seq_dl: false });
    await commands.setOption([on, off], 'sequential', true);
    expect(api.toggleSequentialDownload).toHaveBeenCalledWith([off.hash]);
    expect(off.seq_dl).toBe(true);
    last().undo!();
    await vi.waitFor(() => expect(api.toggleSequentialDownload).toHaveBeenCalledTimes(2));
    expect(off.seq_dl).toBe(false);
  });

  it('undo of automatic management moves the data back to each old folder', async () => {
    // Turning it on relocates files to the category folder; setLocation moves them back (and turns it off).
    const { api, commands, last } = setup();
    const a = makeTorrent({ auto_tmm: false, save_path: '/seed/a' });
    const b = makeTorrent({ auto_tmm: false, save_path: '/seed/b' });
    await commands.setOption([a, b], 'autoManaged', true);
    expect(api.setAutoManagement).toHaveBeenCalledWith([a.hash, b.hash], true);
    last().undo!();
    await vi.waitFor(() => expect(api.setLocation).toHaveBeenCalledTimes(2));
    expect(api.setLocation).toHaveBeenCalledWith([a.hash], '/seed/a');
    expect(api.setLocation).toHaveBeenCalledWith([b.hash], '/seed/b');
    expect([a.auto_tmm, a.save_path]).toEqual([false, '/seed/a']);
  });

  it('sets automatic management with an explicit value', async () => {
    const { api, commands } = setup();
    await commands.setOption([makeTorrent({ auto_tmm: false, hash: 'x' })], 'autoManaged', true);
    expect(api.setAutoManagement).toHaveBeenCalledWith(['x'], true);
  });
});

describe('queue, location, rename, limits', () => {
  it('shows the server message when queueing is disabled', async () => {
    const { api, commands, last } = setup();
    api.moveInQueue.mockRejectedValueOnce(new ApiError('request', 409, 'Torrent queueing must be enabled'));
    await commands.moveInQueue([makeTorrent()], 'top');
    expect(last().title).toBe('Couldn’t change the queue: Torrent queueing must be enabled');
  });

  it('moves torrents and undo moves each back to its old folder', async () => {
    const { api, commands, last } = setup();
    const a = makeTorrent({ save_path: '/a', auto_tmm: true });
    const b = makeTorrent({ save_path: '/b', auto_tmm: false });
    await commands.setLocation([a, b], ' /new ');
    expect(api.setLocation).toHaveBeenCalledWith([a.hash, b.hash], '/new');
    expect([a.save_path, a.auto_tmm]).toEqual(['/new', false]);
    last().undo!();
    await vi.waitFor(() => expect(api.setAutoManagement).toHaveBeenCalledWith([a.hash], true));
    expect(api.setLocation).toHaveBeenCalledWith([a.hash], '/a');
    expect(api.setLocation).toHaveBeenCalledWith([b.hash], '/b');
  });

  it('undo of a move re-enables automatic management only after the move back is done', async () => {
    // setLocation turns automatic management off on the server, so re-enabling must come after it.
    const { api, commands, last } = setup();
    const a = makeTorrent({ save_path: '/a', auto_tmm: true });
    await commands.setLocation([a], '/new');
    let finishMove!: () => void;
    api.setLocation.mockImplementationOnce(() => new Promise<void>((resolve) => (finishMove = resolve)));
    last().undo!();
    await vi.waitFor(() => expect(api.setLocation).toHaveBeenCalledWith([a.hash], '/a'));
    expect(api.setAutoManagement).not.toHaveBeenCalled();
    finishMove();
    await vi.waitFor(() => expect(api.setAutoManagement).toHaveBeenCalledWith([a.hash], true));
  });

  it('ignores a rename to the same or an empty name', async () => {
    const { api, commands } = setup();
    const t = makeTorrent({ name: 'same' });
    await expect(commands.rename(t, 'same')).resolves.toBe(false);
    await expect(commands.rename(t, '   ')).resolves.toBe(false);
    expect(api.rename).not.toHaveBeenCalled();
  });

  it('sends only the limits that changed', async () => {
    const { api, commands, last } = setup();
    const t = makeTorrent({ dl_limit: 0, up_limit: 0 });
    await commands.setLimits([t], { download: 1024, ratioLimit: 2, shareLimitAction: 'Stop' });
    expect(api.setDownloadLimit).toHaveBeenCalledWith([t.hash], 1024);
    expect(api.setUploadLimit).not.toHaveBeenCalled();
    expect(api.setShareLimits).toHaveBeenCalledWith([t.hash], { ratioLimit: 2, seedingTimeLimit: -2, inactiveSeedingTimeLimit: -2, shareLimitAction: 'Stop' });
    expect(t).toMatchObject({ dl_limit: 1024, ratio_limit: 2, share_limit_action: 'Stop' });
    expect(last().title).toBe(`Updated limits for “${t.name}”`);
  });

  it('keeps each torrent’s own share limits when only a speed limit changes', async () => {
    const { api, commands } = setup();
    const a = makeTorrent({ seeding_time_limit: 60 });
    const b = makeTorrent({ seeding_time_limit: 600 });
    await commands.setLimits([a, b], { upload: 2048 });
    expect(api.setUploadLimit).toHaveBeenCalledWith([a.hash, b.hash], 2048);
    expect(api.setShareLimits).not.toHaveBeenCalled();
    expect([a.seeding_time_limit, b.seeding_time_limit]).toEqual([60, 600]);
  });

  it('changes one share field per torrent without touching the others', async () => {
    const { api, commands } = setup();
    const a = makeTorrent({ seeding_time_limit: 60 });
    const b = makeTorrent({ seeding_time_limit: 600 });
    await commands.setLimits([a, b], { ratioLimit: 3 });
    expect(api.setShareLimits).toHaveBeenCalledTimes(2);
    expect(api.setShareLimits).toHaveBeenCalledWith([a.hash], expect.objectContaining({ ratioLimit: 3, seedingTimeLimit: 60 }));
    expect(api.setShareLimits).toHaveBeenCalledWith([b.hash], expect.objectContaining({ ratioLimit: 3, seedingTimeLimit: 600 }));
  });

  it('does nothing when no limit changed', async () => {
    const { api, commands, toasts } = setup();
    await expect(commands.setLimits([makeTorrent()], {})).resolves.toBe(false);
    expect(api.setShareLimits).not.toHaveBeenCalled();
    expect(toasts).toHaveLength(0);
  });
});

describe('remove', () => {
  it('forgets torrents only after the server removed them', async () => {
    const { api, commands, deps, last } = setup();
    const t = makeTorrent({ name: 'old.iso' });
    await commands.remove([t], true);
    expect(api.remove).toHaveBeenCalledWith([t.hash], true);
    expect(deps.forget).toHaveBeenCalledWith([t.hash]);
    expect(last()).toEqual({ title: 'Deleted “old.iso”' });

    api.remove.mockRejectedValueOnce(new ApiError('network', 0, 'down'));
    await expect(commands.remove([t], false)).resolves.toBe(false);
    expect(deps.forget).toHaveBeenCalledTimes(1);
  });
});

describe('copy and export', () => {
  it('copies magnet links without ever putting them in the toast', async () => {
    const { commands, deps, last } = setup();
    const a = makeTorrent({ magnet_uri: 'magnet:?xt=urn:btih:aaa&tr=https%3A%2F%2Ftracker.example%2Fa%2FPASSKEY%2Fannounce' });
    const b = makeTorrent({ magnet_uri: 'magnet:?xt=urn:btih:bbb' });
    await commands.copy([a, b], 'magnet');
    expect(deps.copyText).toHaveBeenCalledWith(`${a.magnet_uri}\n${b.magnet_uri}`);
    expect(last()).toEqual({ title: 'Copied magnet links' });
    expect(JSON.stringify(last())).not.toContain('PASSKEY');
  });

  it('reports a clipboard failure', async () => {
    const { commands, last } = setup({ copyText: vi.fn(async () => Promise.reject(new Error('Clipboard unavailable'))) });
    await commands.copy([makeTorrent({ name: 'x' })], 'name');
    expect(last().title).toBe('Couldn’t copy to the clipboard');
  });

  it('downloads one .torrent per torrent with a safe filename', async () => {
    const { api, commands, deps } = setup();
    await commands.exportFiles([makeTorrent({ hash: 'h1', name: 'a/b' })]);
    expect(api.exportTorrent).toHaveBeenCalledWith('h1');
    expect(deps.download).toHaveBeenCalledWith(expect.any(Blob), 'a_b.torrent');
  });
});
