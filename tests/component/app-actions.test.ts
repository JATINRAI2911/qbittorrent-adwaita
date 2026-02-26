import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import type { MaindataResponse } from '../../src/api/types';
import { Session } from '../../src/state/session.svelte';
import { fakeTorrentApi } from '../fixtures/fake-api';

const full: MaindataResponse = {
  rid: 1,
  full_update: true,
  torrents: {
    aaa: { name: 'ubuntu.iso', state: 'uploading', progress: 1, size: 1000 },
    bbb: { name: 'debian.iso', state: 'stalledUP', progress: 1, size: 2000 },
  },
  server_state: { dl_info_speed: 0, up_info_speed: 0, queueing: false },
};

function renderApp() {
  const api = fakeTorrentApi();
  const session = new Session({
    login: vi.fn(async () => 'ok' as const),
    logout: vi.fn(async () => {}),
    maindata: vi.fn(async (rid: number) => (rid === 0 ? full : { rid: 2 })),
    isHidden: () => false,
    onVisible: () => () => {},
  });
  const view = render(App, { session, api });
  return { api, session, ...view };
}

describe('App actions', () => {
  it('stops a torrent from its row and undoes it from the toast', async () => {
    const { api, unmount } = renderApp();
    const row = (await screen.findByText('ubuntu.iso')).closest('[data-hash]') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Stop' }));
    expect(api.stop).toHaveBeenCalledWith(['aaa']);
    expect(await screen.findByRole('status')).toHaveTextContent('Stopped “ubuntu.iso”');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await vi.waitFor(() => expect(api.start).toHaveBeenCalledWith(['aaa']));
    unmount();
  });

  it('deletes through the context menu and the confirmation dialog', async () => {
    const { api, unmount } = renderApp();
    const row = (await screen.findByText('debian.iso')).closest('[data-hash]') as HTMLElement;
    await userEvent.pointer({ keys: '[MouseRight]', target: row });
    await userEvent.click(screen.getByRole('menuitem', { name: /Delete…/ }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));
    expect(api.remove).toHaveBeenCalledWith(['bbb'], false);
    await vi.waitFor(() => expect(screen.queryByText('debian.iso')).toBeNull());
    unmount();
  });

  it('disables the Queue submenu when qBittorrent has queueing off', async () => {
    const { unmount } = renderApp();
    const row = (await screen.findByText('ubuntu.iso')).closest('[data-hash]') as HTMLElement;
    await userEvent.pointer({ keys: '[MouseRight]', target: row });
    expect(screen.getByRole('menuitem', { name: /Queue/ })).toBeDisabled();
    unmount();
  });
});
