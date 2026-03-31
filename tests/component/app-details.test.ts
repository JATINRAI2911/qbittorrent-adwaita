import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import type { MaindataResponse } from '../../src/api/types';
import { Session } from '../../src/state/session.svelte';
import { fakeTorrentApi } from '../fixtures/fake-api';
import { fakeClientData } from '../fixtures/fake-clientdata';
import { fakeDetailsApi } from '../fixtures/fake-details-api';

const full: MaindataResponse = {
  rid: 1,
  full_update: true,
  torrents: {
    aaa: { name: 'first.iso', state: 'uploading', progress: 1, added_on: 2 },
    bbb: { name: 'second.iso', state: 'uploading', progress: 1, added_on: 1 },
  },
  server_state: {},
};

async function renderApp(maindata: (rid: number) => Promise<MaindataResponse> = async (rid) => (rid === 0 ? full : { rid: 2 })) {
  const details = fakeDetailsApi();
  details.properties.mockImplementation(async (hash) => ({ save_path: `/data/${hash}`, total_size: 1, pieces_num: 1, pieces_have: 1, piece_size: 1, infohash_v1: hash, comment: '', completion_date: -1, creation_date: 0, created_by: '', addition_date: 0 }) as never);
  const session = new Session({ login: vi.fn(async () => 'ok' as const), logout: vi.fn(async () => {}), maindata: vi.fn(maindata), isHidden: () => false, onVisible: () => () => {} });
  const torrents = fakeTorrentApi();
  const view = render(App, { session, api: torrents, clientdata: fakeClientData(), details });
  await screen.findByText('first.iso');
  return { details, torrents, ...view };
}

const row = (name: string) => screen.getAllByText(name).find((el) => el.closest('[data-hash]'))!.closest('[data-hash]') as HTMLElement;

describe('App details sheet', () => {
  it('opens on a row click and loads the Overview', async () => {
    const { details, unmount } = await renderApp();
    await userEvent.click(row('first.iso'));
    const sheet = screen.getByRole('region', { name: 'Details' });
    expect(within(sheet).getByRole('heading', { name: 'first.iso' })).toBeInTheDocument();
    await vi.waitFor(() => expect(within(sheet).getByText('/data/aaa')).toBeInTheDocument());
    expect(details.properties).toHaveBeenCalledWith('aaa');
    unmount();
  });

  it('switches tabs, minimizes to the bar, and closes with Esc', async () => {
    const { details, unmount } = await renderApp();
    await userEvent.click(row('first.iso'));
    await userEvent.click(screen.getByRole('radio', { name: 'Files' }));
    await vi.waitFor(() => expect(details.files).toHaveBeenCalledWith('aaa'));
    await userEvent.click(screen.getByRole('button', { name: 'Minimize' }));
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Details' })).toBeNull();
    unmount();
  });

  it('opens with Enter and follows ↑/↓', async () => {
    const { unmount } = await renderApp();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(within(screen.getByRole('region', { name: 'Details' })).getByRole('heading', { name: 'first.iso' })).toBeInTheDocument();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{ArrowDown}');
    expect(within(screen.getByRole('region', { name: 'Details' })).getByRole('heading', { name: 'second.iso' })).toBeInTheDocument();
    unmount();
  });

  it('hides in selection mode and does not open from a Ctrl-click', async () => {
    const { unmount } = await renderApp();
    const user = userEvent.setup();
    await user.keyboard('{Control>}');
    await user.click(row('first.iso'));
    await user.keyboard('{/Control}');
    expect(screen.queryByRole('region', { name: 'Details' })).toBeNull();
    unmount();
  });

  it('closes when its torrent disappears', async () => {
    let gone = false;
    const { unmount } = await renderApp(async (rid) => (rid === 0 ? full : gone ? { rid: 3, torrents_removed: ['aaa'] } : { rid: 2 }));
    await userEvent.click(row('first.iso'));
    expect(screen.getByRole('region', { name: 'Details' })).toBeInTheDocument();
    gone = true;
    await vi.waitFor(() => expect(screen.queryByRole('region', { name: 'Details' })).toBeNull(), { timeout: 3000 });
    unmount();
  });

  it('scrolls the opened torrent’s row into view so the sheet does not cover it', async () => {
    const scrolled: Element[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    try {
      const { unmount } = await renderApp();
      await userEvent.click(row('second.iso'));
      await vi.waitFor(() => expect(scrolled).toContain(row('second.iso')));
      unmount();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('does not run list shortcuts for keys pressed inside the sheet', async () => {
    const { torrents, unmount } = await renderApp();
    await userEvent.click(row('first.iso'));
    const handle = screen.getByRole('separator', { name: 'Resize details' });
    handle.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Delete}');
    await userEvent.keyboard('x');
    expect(torrents.stop).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('searchbox', { name: 'Search torrents' })).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Overview' }));
    await userEvent.keyboard('{ArrowDown}');
    expect(within(screen.getByRole('region', { name: 'Details' })).getByRole('heading', { name: 'first.iso' })).toBeInTheDocument();
    unmount();
  });

  it('clears a filter inside the sheet with Esc instead of closing the sheet', async () => {
    const { details, unmount } = await renderApp();
    details.files.mockImplementation(async () =>
      Array.from({ length: 25 }, (_, i) => ({ index: i, name: `Pack/e${i}.mkv`, size: 1, progress: 1, priority: 1, piece_range: [0, 0] as [number, number], availability: 1 })),
    );
    await userEvent.click(row('first.iso'));
    await userEvent.click(screen.getByRole('radio', { name: 'Files' }));
    const filter = await screen.findByRole('searchbox', { name: 'Filter files' });
    await userEvent.type(filter, 'e1');
    await userEvent.keyboard('{Escape}');
    expect(filter).toHaveValue('');
    expect(screen.getByRole('region', { name: 'Details' })).toBeInTheDocument();
    unmount();
  });

  it('starts each torrent’s Files tab without the previous torrent’s filter', async () => {
    const { details, unmount } = await renderApp();
    const pack = Array.from({ length: 25 }, (_, i) => ({ index: i, name: `Pack/e${i}.mkv`, size: 1, progress: 1, priority: 1, piece_range: [0, 0] as [number, number], availability: 1 }));
    details.files.mockImplementation(async (hash: string) =>
      hash === 'aaa' ? pack : [{ index: 0, name: 'single.iso', size: 1, progress: 1, priority: 1, piece_range: [0, 0] as [number, number], availability: 1 }],
    );
    await userEvent.click(row('first.iso'));
    await userEvent.click(screen.getByRole('radio', { name: 'Files' }));
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Filter files' }), 'zzz');
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.click(row('second.iso'));
    expect(await screen.findByText('single.iso')).toBeInTheDocument();
    expect(screen.queryByText(/No files match/)).toBeNull();
    unmount();
  });
});
