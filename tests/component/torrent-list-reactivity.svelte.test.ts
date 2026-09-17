import { render, screen, within } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import type { Torrent } from '../../src/api/types';
import TorrentList from '../../src/features/list/TorrentList.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

describe('TorrentList reactivity', () => {
  it('moves a torrent between groups when its state changes, and updates live text in place', () => {
    const torrent = $state<Torrent>(makeTorrent({ name: 'ubuntu.iso', state: 'downloading', size: 1000, completed: 100, progress: 0.1, dlspeed: 1000 }));
    const other = $state<Torrent>(makeTorrent({ state: 'stalledUP', progress: 1 }));
    const app = makeAppContext([]);
    app.session.torrents.set(torrent.hash, torrent);
    app.session.torrents.set(other.hash, other);
    render(TorrentList, { context: withApp(app) });

    expect(within(screen.getByRole('region', { name: 'Downloading' })).getByText('ubuntu.iso')).toBeInTheDocument();
    expect(screen.getByText(/↓ 1\.0 kB\/s/)).toBeInTheDocument();

    torrent.dlspeed = 2000;
    flushSync();
    expect(screen.getByText(/↓ 2\.0 kB\/s/)).toBeInTheDocument();

    torrent.state = 'stoppedDL';
    flushSync();
    expect(screen.queryByRole('region', { name: 'Downloading' })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Stopped' })).getByText('ubuntu.iso')).toBeInTheDocument();
  });

  it('updates only the ticking row: the row is patched in place, and other rows aren’t touched', () => {
    const busy = $state<Torrent>(makeTorrent({ name: 'busy.iso', state: 'downloading', size: 1000, completed: 100, progress: 0.1, dlspeed: 1000 }));
    const calm = $state<Torrent>(makeTorrent({ name: 'calm.iso', state: 'downloading', size: 1000, completed: 500, progress: 0.5, dlspeed: 0 }));
    const app = makeAppContext([]);
    app.session.torrents.set(busy.hash, busy);
    app.session.torrents.set(calm.hash, calm);
    render(TorrentList, { context: withApp(app) });
    const busyRow = screen.getByText('busy.iso').closest('[data-hash]')!;
    const calmRow = screen.getByText('calm.iso').closest('[data-hash]')!;
    const touched: MutationRecord[] = [];
    const observer = new MutationObserver((records) => touched.push(...records));
    observer.observe(calmRow, { subtree: true, childList: true, characterData: true, attributes: true });

    busy.dlspeed = 5000;
    busy.completed = 200;
    busy.progress = 0.2;
    flushSync();
    observer.takeRecords().forEach((r) => touched.push(r));
    observer.disconnect();

    expect(screen.getByText('busy.iso').closest('[data-hash]')).toBe(busyRow); // not re-created
    expect(screen.getByText('calm.iso').closest('[data-hash]')).toBe(calmRow);
    expect(touched).toEqual([]);
  });
});

