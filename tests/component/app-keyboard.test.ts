import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import type { MaindataResponse } from '../../src/api/types';
import { Session } from '../../src/state/session.svelte';
import { fakeTorrentApi } from '../fixtures/fake-api';

function renderApp(maindata: (rid: number) => Promise<MaindataResponse>) {
  const api = fakeTorrentApi();
  const session = new Session({
    login: vi.fn(async () => 'ok' as const),
    logout: vi.fn(async () => {}),
    maindata: vi.fn(maindata),
    isHidden: () => false,
    onVisible: () => () => {},
  });
  return { api, ...render(App, { session, api }) };
}

const full: MaindataResponse = {
  rid: 1,
  full_update: true,
  torrents: {
    aaa: { name: 'first.iso', state: 'uploading', progress: 1, added_on: 2 },
    bbb: { name: 'second.iso', state: 'uploading', progress: 1, added_on: 1 },
  },
  server_state: {},
};

describe('App keyboard', () => {
  it('moves with arrows, stops with Space, and opens Delete with Backspace', async () => {
    const { api, unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    await screen.findByText('first.iso');
    await userEvent.keyboard('{ArrowDown}{ArrowDown} ');
    expect(api.stop).toHaveBeenCalledWith(['bbb']);
    await userEvent.keyboard('{Backspace}');
    expect(screen.getByRole('alertdialog', { name: 'Delete Torrent?' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    unmount();
  });

  it('selects everything with Ctrl+A and leaves selection mode with Escape', async () => {
    const { unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    await screen.findByText('first.iso');
    await userEvent.keyboard('{Control>}a{/Control}');
    expect(screen.getByRole('button', { name: /2 Selected/ })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: /Selected/ })).toBeNull();
    unmount();
  });

  it('does not act on torrents while typing in a dialog field', async () => {
    const { api, unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    await screen.findByText('first.iso');
    await userEvent.keyboard('{ArrowDown}{F2}');
    const input = screen.getByLabelText('Name');
    await userEvent.type(input, ' x{Backspace}{Backspace}');
    expect(api.stop).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    unmount();
  });

  it('prunes the selection when a selected torrent disappears on the server', async () => {
    let removed = false;
    const { unmount } = renderApp(async (rid) => (rid === 0 ? full : removed ? { rid: 3, torrents_removed: ['aaa', 'bbb'] } : { rid: 2 }));
    await screen.findByText('first.iso');
    await userEvent.keyboard('{Control>}a{/Control}');
    expect(screen.getByRole('button', { name: /2 Selected/ })).toBeInTheDocument();
    removed = true;
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: /Selected/ })).toBeNull(), { timeout: 3000 });
    unmount();
  });
});
