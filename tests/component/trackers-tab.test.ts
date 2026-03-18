import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Tracker } from '../../src/api/details';
import TrackersTab from '../../src/features/details/TrackersTab.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

const SECRET = 'https://tracker.example.org/a/0123456789abcdef0123456789abcdef/announce';
const tr = (overrides: Partial<Tracker>): Tracker => ({ url: SECRET, tier: 0, status: 2, msg: '', num_seeds: 56, num_leeches: 0, num_peers: 0, num_downloaded: -1, ...overrides });

function setup(trackers: Tracker[] | null) {
  const torrent = makeTorrent({ hash: 'h', name: 'x' });
  const app = makeAppContext([torrent]);
  render(TrackersTab, { props: { torrent, trackers }, context: withApp(app) });
  return { app, torrent };
}

describe('TrackersTab', () => {
  it('shows masked URLs, status and the other peer sources', () => {
    setup([tr({ url: '** [DHT] **', status: 0, msg: 'This torrent is private' }), tr({ url: '** [PeX] **', status: 0 }), tr({ url: '** [LSD] **', status: 0 }), tr({}), tr({ url: 'udp://open.example:1337/announce', status: 6, msg: 'skipping tracker announce (unreachable)' })]);
    expect(screen.getByText('https://tracker.example.org/a/••••/announce')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('0123456789abcdef');
    expect(screen.getByText(/^Working · 56 seeds, 0 leechers, 0 peers/)).toBeInTheDocument();
    expect(screen.getByText('Unreachable · skipping tracker announce (unreachable)')).toHaveClass('error');
    expect(screen.getByText('DHT')).toBeInTheDocument();
    expect(screen.getAllByText('This torrent is private')).not.toHaveLength(0);
  });

  it('copies and edits with the full URL, and confirms before removing', async () => {
    const { app } = setup([tr({})]);
    await userEvent.click(screen.getByRole('button', { name: 'More for tracker.example.org' }));
    let items = app.popovers.current!.model.sections.flat();
    app.popovers.close(); // a real menu closes itself before running the action
    items.find((i) => i.label === 'Copy URL')!.action!();
    expect(app.detailCommands.copyTracker).toHaveBeenCalledWith(SECRET);

    await userEvent.click(screen.getByRole('button', { name: 'More for tracker.example.org' }));
    items = app.popovers.current!.model.sections.flat();
    app.popovers.close();
    items.find((i) => i.label === 'Edit URL…')!.action!();
    const edit = app.dialogs.stack.at(-1)!.props;
    expect(edit.value).toBe(SECRET);
    (edit.onconfirm as (v: string) => void)('udp://new.example:1');
    expect(app.detailCommands.editTracker).toHaveBeenCalledWith('h', SECRET, 'udp://new.example:1');

    await userEvent.click(screen.getByRole('button', { name: 'More for tracker.example.org' }));
    const remove = app.popovers.current!.model.sections.flat().find((i) => i.label === 'Remove…')!;
    app.popovers.close();
    remove.action!();
    const confirm = app.dialogs.stack.at(-1)!.props;
    expect(confirm.heading).toBe('Remove Tracker?');
    expect(JSON.stringify(confirm)).not.toContain('0123456789abcdef');
    (confirm.onresponse as (id: string) => void)('remove');
    expect(app.detailCommands.removeTracker).toHaveBeenCalledWith('h', SECRET);
  });

  it('adds trackers and reannounces from the header', async () => {
    const { app, torrent } = setup([tr({})]);
    await userEvent.click(screen.getByRole('button', { name: 'Reannounce' }));
    expect(app.commands.reannounce).toHaveBeenCalledWith([torrent]);
    await userEvent.click(screen.getByRole('button', { name: 'Add Trackers' }));
    (app.dialogs.stack.at(-1)!.props.onconfirm as (text: string) => void)('udp://a:1');
    expect(app.detailCommands.addTrackers).toHaveBeenCalledWith('h', 'udp://a:1');
  });

  it('shows a spinner until trackers load', () => {
    setup(null);
    expect(screen.getByRole('progressbar', { name: 'Loading trackers' })).toBeInTheDocument();
  });
});
