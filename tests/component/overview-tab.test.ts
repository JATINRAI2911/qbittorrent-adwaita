import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { TorrentProperties } from '../../src/api/details';
import OverviewTab from '../../src/features/details/OverviewTab.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

const props = (overrides: Partial<TorrentProperties> = {}): TorrentProperties =>
  ({
    addition_date: 1_785_730_467,
    comment: '',
    completion_date: -1,
    created_by: 'mkbrr/1.18.0',
    creation_date: 1_785_643_053,
    dl_limit: -1,
    up_limit: -1,
    download_path: '',
    infohash_v1: 'f1874f2b82418de84efa2cfb2a368f6b33c86fdc',
    infohash_v2: '',
    is_private: true,
    piece_size: 2_097_152,
    pieces_have: 655,
    pieces_num: 1310,
    save_path: '/Media/Movies',
    seeding_time: 2_402_363,
    time_elapsed: 2_403_047,
    seeds: 3,
    seeds_total: 56,
    peers: 1,
    peers_total: 4,
    share_ratio: 0.035,
    total_downloaded: 2_749_327_346,
    total_uploaded: 96_503_884,
    total_wasted: 0,
    total_size: 2_746_253_180,
    ...overrides,
  }) as TorrentProperties;

function setup(overrides: Partial<TorrentProperties> = {}) {
  const torrent = makeTorrent({ hash: 'h', name: 'Obsession.mkv', seq_dl: true, category: 'Films', tags: 'keep' });
  const app = makeAppContext([torrent]);
  render(OverviewTab, { props: { torrent, properties: props(overrides), pieces: [2, 0] }, context: withApp(app) });
  return { app, torrent };
}

const group = (name: string) => screen.getByRole('region', { name });

describe('OverviewTab', () => {
  it('shows the piece map and transfer figures', () => {
    setup();
    expect(screen.getByRole('img', { name: '655 of 1,310 pieces downloaded' })).toBeInTheDocument();
    expect(within(group('Transfer')).getByText('2.7 GB')).toBeInTheDocument();
    expect(within(group('Transfer')).getByText('3 (56)')).toBeInTheDocument();
    expect(within(group('Transfer')).getAllByText('27 days, 19 hours')).toHaveLength(2); // time active and seeding time
  });

  it('moves, edits limits, and changes category and tags from Location and Limits', async () => {
    const { app, torrent } = setup();
    await userEvent.click(within(group('Location')).getByRole('button', { name: 'Move…' }));
    expect(app.openers.move).toHaveBeenCalledWith([torrent]);
    await userEvent.click(within(group('Limits')).getByRole('button', { name: 'Edit' }));
    expect(app.openers.limits).toHaveBeenCalledWith([torrent]);
    await userEvent.click(within(group('Location')).getByRole('button', { name: /Category Films/ }));
    expect(app.popovers.current?.model.title).toBe('Category');
    expect(within(group('Limits')).getAllByText('Unlimited')).toHaveLength(2);
  });

  it('toggles options through the shared commands', async () => {
    const { app, torrent } = setup();
    const sequential = within(group('Options')).getByRole('switch', { name: /Sequential download/ });
    expect(sequential).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(sequential);
    expect(app.commands.setOption).toHaveBeenCalledWith([torrent], 'sequential', false);
  });

  it('copies the info hash and edits the comment', async () => {
    const { app, torrent } = setup({ comment: 'old note' });
    await userEvent.click(within(group('Information')).getByRole('button', { name: 'Copy info hash' }));
    expect(app.commands.copy).toHaveBeenCalledWith([torrent], 'hashV1');
    await userEvent.click(within(group('Information')).getByRole('button', { name: 'Edit comment' }));
    const dialog = app.dialogs.stack.at(-1)!.props;
    expect(dialog.value).toBe('old note');
    (dialog.onconfirm as (v: string) => void)('new note');
    expect(app.detailCommands.setComment).toHaveBeenCalledWith('h', 'new note');
    expect(within(group('Information')).getByText('Yes')).toBeInTheDocument();
  });

  it('shows a spinner until properties load', () => {
    const torrent = makeTorrent({});
    render(OverviewTab, { props: { torrent, properties: null, pieces: null }, context: withApp(makeAppContext([torrent])) });
    expect(screen.getByRole('progressbar', { name: 'Loading details' })).toBeInTheDocument();
  });
});
