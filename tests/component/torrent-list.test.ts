import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Torrent } from '../../src/api/types';
import TorrentList from '../../src/features/list/TorrentList.svelte';
import TorrentRow from '../../src/features/list/TorrentRow.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

const renderRow = (torrent: Torrent) => render(TorrentRow, { props: { torrent }, context: withApp(makeAppContext([torrent])) });
const seeds = (n: number) => Array.from({ length: n }, () => makeTorrent({ state: 'stalledUP', progress: 1 }));

describe('TorrentList', () => {
  it('shows an empty status page when there are no torrents', () => {
    render(TorrentList, { context: withApp(makeAppContext([])) });
    expect(screen.getByRole('heading', { name: 'No Torrents' })).toBeInTheDocument();
  });

  it('renders groups in order with counts, problems first', () => {
    render(TorrentList, { context: withApp(makeAppContext([makeTorrent({ state: 'downloading', name: 'ubuntu.iso' }), makeTorrent({ state: 'error', name: 'broken.iso' })])) });
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Needs Attention', 'Downloading']);
    expect(screen.getByText('broken.iso')).toBeInTheDocument();
  });

  it('shows 8 rows per group and expands with Show All', async () => {
    render(TorrentList, { context: withApp(makeAppContext([...seeds(30), makeTorrent({ state: 'downloading' })])) });
    const seeding = screen.getByRole('region', { name: 'Seeding' });
    expect(within(seeding).getAllByRole('listitem')).toHaveLength(8);
    await userEvent.click(within(seeding).getByRole('button', { name: 'Show All 30' }));
    expect(within(seeding).getAllByRole('listitem')).toHaveLength(30);
  });

  it('collapses a large Stopped group in a large library and reveals it on request', async () => {
    const stopped = Array.from({ length: 10 }, () => makeTorrent({ state: 'stoppedUP', progress: 1 }));
    render(TorrentList, { context: withApp(makeAppContext([...stopped, ...seeds(20)])) });
    const group = screen.getByRole('region', { name: 'Stopped' });
    expect(within(group).queryAllByRole('listitem')).toHaveLength(0);
    await userEvent.click(within(group).getByRole('button', { name: 'Show 10 Torrents' }));
    expect(within(group).getAllByRole('listitem')).toHaveLength(8);
  });

  it('pages 100 at a time when only one group is visible', async () => {
    render(TorrentList, { context: withApp(makeAppContext(seeds(150))) });
    const group = screen.getByRole('region', { name: 'Seeding' });
    expect(within(group).getAllByRole('listitem')).toHaveLength(100);
    await userEvent.click(within(group).getByRole('button', { name: /Show 50 More/ }));
    expect(within(group).getAllByRole('listitem')).toHaveLength(150);
  });
});

describe('TorrentRow', () => {
  it('renders hostile names as literal text, never as markup', () => {
    const name = '<img src=x onerror=alert(1)> ' + 'x'.repeat(300) + ' مرحبا';
    const { container } = renderRow(makeTorrent({ name, state: 'downloading' }));
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('lets right-to-left names pick their own direction so they ellipsize at the correct end', () => {
    const name = 'שלום עולם '.repeat(40).trim();
    renderRow(makeTorrent({ name, state: 'downloading' }));
    expect(screen.getByTitle(name)).toHaveAttribute('dir', 'auto');
  });

  it('shows category and tags, the subtitle and an ETA', () => {
    renderRow(makeTorrent({ state: 'downloading', category: 'Linux ISOs', tags: 'keep, private', size: 1000, completed: 500, progress: 0.5, dlspeed: 100, eta: 300 }));
    expect(screen.getByText('Linux ISOs')).toBeInTheDocument();
    expect(screen.getByText('keep, private')).toBeInTheDocument();
    expect(screen.getByText('5 minutes left')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('offers Start on torrents that need attention', () => {
    renderRow(makeTorrent({ state: 'missingFiles' }));
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('hides the progress bar for finished torrents', () => {
    renderRow(makeTorrent({ state: 'stalledUP', progress: 1 }));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
