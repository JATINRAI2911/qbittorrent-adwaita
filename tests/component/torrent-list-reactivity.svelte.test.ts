import { render, screen, within } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { describe, expect, it } from 'vitest';
import type { Torrent } from '../../src/api/types';
import TorrentList from '../../src/features/list/TorrentList.svelte';
import { ListModel } from '../../src/features/list/list-model.svelte';
import { makeTorrent } from '../fixtures/torrents';

describe('TorrentList reactivity', () => {
  it('moves a torrent between groups when its state changes, and updates live text in place', () => {
    const torrent = $state<Torrent>(makeTorrent({ name: 'ubuntu.iso', state: 'downloading', size: 1000, completed: 100, progress: 0.1, dlspeed: 1000 }));
    const other = $state<Torrent>(makeTorrent({ state: 'stalledUP', progress: 1 }));
    const torrents = new SvelteMap([[torrent.hash, torrent], [other.hash, other]]);
    render(TorrentList, { model: new ListModel(torrents) });

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
});
