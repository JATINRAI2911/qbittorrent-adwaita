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
  const view = render(App, { session, api: fakeTorrentApi(), clientdata: fakeClientData(), details });
  await screen.findByText('first.iso');
  return { details, ...view };
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
});
