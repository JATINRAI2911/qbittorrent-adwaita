import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import type { MaindataResponse } from '../../src/api/types';
import { Session } from '../../src/state/session.svelte';
import { fakeTorrentApi } from '../fixtures/fake-api';
import { fakeClientData } from '../fixtures/fake-clientdata';

const full: MaindataResponse = {
  rid: 1,
  full_update: true,
  torrents: {
    aaa: { name: 'first.iso', state: 'uploading', progress: 1, added_on: 2 },
    bbb: { name: 'second.iso', state: 'uploading', progress: 1, added_on: 1 },
  },
  server_state: {},
};

async function renderApp() {
  const session = new Session({
    login: vi.fn(async () => 'ok' as const),
    logout: vi.fn(async () => {}),
    maindata: vi.fn(async (rid: number) => (rid === 0 ? full : { rid: 2 })),
    isHidden: () => false,
    onVisible: () => () => {},
  });
  const view = render(App, { session, api: fakeTorrentApi(), clientdata: fakeClientData() });
  await screen.findByText('first.iso');
  return view;
}

describe('App search', () => {
  it('opens with Ctrl+F, filters as you type, and Esc clears then closes', async () => {
    const { unmount } = await renderApp();
    await userEvent.keyboard('{Control>}f{/Control}');
    const box = screen.getByRole('searchbox', { name: 'Search torrents' });
    expect(box).toHaveFocus();
    await userEvent.type(box, 'sec');
    expect(screen.queryByText('first.iso')).toBeNull();
    expect(screen.getByText('second.iso')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(box).toHaveValue('');
    expect(screen.getByText('first.iso')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).toBeNull();
    unmount();
  });

  it('starts searching when you type with nothing focused', async () => {
    const { unmount } = await renderApp();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('fir');
    expect(screen.getByRole('searchbox', { name: 'Search torrents' })).toHaveValue('fir');
    expect(screen.queryByText('second.iso')).toBeNull();
    unmount();
  });

  it('moves into the list with ↓ from the search entry', async () => {
    const { unmount } = await renderApp();
    await userEvent.keyboard('{Control>}f{/Control}');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('first.iso').closest('[data-hash]')).toHaveClass('kfocus');
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
    unmount();
  });

  it('drops torrents hidden by a filter from the selection', async () => {
    const { unmount } = await renderApp();
    await userEvent.keyboard('{Control>}a{/Control}');
    expect(screen.getByRole('button', { name: /2 Selected/ })).toBeInTheDocument();
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('first');
    expect(screen.getByRole('button', { name: /1 Selected/ })).toBeInTheDocument();
    unmount();
  });

  it('switches views with Ctrl+2 and Ctrl+1', async () => {
    const { unmount } = await renderApp();
    await userEvent.keyboard('{Control>}2{/Control}');
    expect(screen.getByRole('grid', { name: 'Torrents' })).toBeInTheDocument();
    await userEvent.keyboard('{Control>}1{/Control}');
    expect(screen.queryByRole('grid')).toBeNull();
    unmount();
  });
});
