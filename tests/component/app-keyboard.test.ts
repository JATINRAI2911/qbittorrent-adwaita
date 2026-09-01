import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
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

  it('moves real focus to the row, so screen readers follow it', async () => {
    const { unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    const first = (await screen.findByText('first.iso')).closest<HTMLElement>('[data-hash]')!;
    await userEvent.keyboard('{ArrowDown}');
    expect(first).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('second.iso').closest('[data-hash]')).toHaveFocus();
    unmount();
  });

  it('hides the keyboard ring when focus moves elsewhere', async () => {
    const { unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    const first = (await screen.findByText('first.iso')).closest<HTMLElement>('[data-hash]')!;
    await userEvent.keyboard('{ArrowDown}');
    expect(first).toHaveClass('kfocus');
    screen.getByRole('button', { name: 'Search' }).focus();
    await Promise.resolve();
    expect(first).not.toHaveClass('kfocus');
    unmount();
  });

  it('returns focus to the torrent when Esc closes its details', async () => {
    const { unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    const first = (await screen.findByText('first.iso')).closest<HTMLElement>('[data-hash]')!;
    await userEvent.keyboard('{ArrowDown}{Enter}');
    const sheet = await screen.findByRole('region', { name: /details/i });
    sheet.querySelector<HTMLElement>('[role="radio"]')!.focus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: /details/i })).toBeNull();
    expect(first).toHaveFocus();
    unmount();
  });

  it('returns focus to the torrent when the sheet is closed or minimized with its buttons', async () => {
    const { unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    const first = (await screen.findByText('first.iso')).closest<HTMLElement>('[data-hash]')!;
    await userEvent.keyboard('{ArrowDown}{Enter}');
    const sheet = await screen.findByRole('region', { name: /details/i });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Minimize' }));
    expect(first).toHaveFocus();
    await userEvent.click(within(await screen.findByRole('region', { name: /details/i })).getByRole('button', { name: 'Close' }));
    expect(first).toHaveFocus();
    unmount();
  });

  it('reveals the open torrent above the sheet once, not again on every window resize', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    onTestFinished(() => {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });
    const { unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    await screen.findByText('first.iso');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await screen.findByRole('region', { name: /details/i });
    await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
    const calls = scroll.mock.calls.length;
    window.innerHeight = 500;
    window.dispatchEvent(new Event('resize'));
    await new Promise((r) => setTimeout(r, 20));
    expect(scroll.mock.calls.length).toBe(calls);
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

  it('in selection mode, Space toggles the focused row instead of acting on the whole selection', async () => {
    const { api, unmount } = renderApp(async (rid) => (rid === 0 ? full : { rid: 2 }));
    const user = userEvent.setup();
    const row = (name: string) => screen.getByText(name).closest('[data-hash]') as HTMLElement;
    await screen.findByText('first.iso');
    await user.click(row('first.iso'));
    await user.keyboard('{Control>}');
    await user.click(row('second.iso'));
    await user.keyboard('{/Control}');
    expect(screen.getByRole('button', { name: /2 Selected/ })).toBeInTheDocument();
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard(' ');
    expect(api.stop).not.toHaveBeenCalled();
    expect(api.start).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /1 Selected/ })).toBeInTheDocument();
    unmount();
  });
});
