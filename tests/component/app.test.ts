import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import { ApiError } from '../../src/api/client';
import type { MaindataResponse } from '../../src/api/types';
import { Session, type SessionDeps } from '../../src/state/session.svelte';

const full: MaindataResponse = {
  rid: 1,
  full_update: true,
  torrents: { aaa: { name: 'ubuntu.iso', state: 'downloading', size: 1000, completed: 500, progress: 0.5 } },
  server_state: { dl_info_speed: 8_200_000, up_info_speed: 0 },
};

function makeSession(overrides: Partial<SessionDeps>) {
  return new Session({
    login: vi.fn(async () => 'ok' as const),
    logout: vi.fn(async () => {}),
    maindata: vi.fn(async () => full),
    isHidden: () => false,
    onVisible: () => () => {},
    ...overrides,
  });
}

describe('App', () => {
  it('logs in and then shows the grouped list with a live subtitle', async () => {
    const maindata = vi.fn<(rid: number) => Promise<MaindataResponse>>().mockRejectedValueOnce(new ApiError('auth', 403, '')).mockResolvedValue(full);
    const { unmount } = render(App, { session: makeSession({ maindata }) });

    await userEvent.type(await screen.findByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('ubuntu.iso')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Downloading' })).toBeInTheDocument();
    // Testing Library collapses whitespace, so the double space in the subtitle is matched with \s+.
    expect(screen.getByText(/^1 downloading · ↓ 8\.2 MB\/s\s+↑ 0 bytes\/s$/)).toBeInTheDocument();
    unmount();
  });

  it('shows a full-page offline state before any data arrives, with Retry Now', async () => {
    const maindata = vi.fn<(rid: number) => Promise<MaindataResponse>>().mockRejectedValueOnce(new ApiError('network', 0, 'down')).mockResolvedValue(full);
    const { unmount } = render(App, { session: makeSession({ maindata }) });

    expect(await screen.findByRole('heading', { name: 'Can’t Reach qBittorrent' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry Now' }));
    expect(await screen.findByText('ubuntu.iso')).toBeInTheDocument();
    unmount();
  });

  it('keeps the list and shows a banner when the connection drops later', async () => {
    const maindata = vi
      .fn<(rid: number) => Promise<MaindataResponse>>()
      .mockResolvedValueOnce(full)
      .mockRejectedValue(new ApiError('network', 0, 'down'));
    const { unmount } = render(App, { session: makeSession({ maindata }) });

    expect(await screen.findByText('ubuntu.iso')).toBeInTheDocument();
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Can’t reach qBittorrent');
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('ubuntu.iso')).toBeInTheDocument();
    unmount();
  });

  it('shows the login over the kept list when the session expires', async () => {
    const maindata = vi
      .fn<(rid: number) => Promise<MaindataResponse>>()
      .mockResolvedValueOnce(full)
      .mockRejectedValue(new ApiError('auth', 403, ''));
    const { unmount } = render(App, { session: makeSession({ maindata }) });

    expect(await screen.findByText('ubuntu.iso')).toBeInTheDocument();
    expect(await screen.findByLabelText('Username', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('ubuntu.iso')).toBeInTheDocument();
    unmount();
  });

  it('offers the login form again when the first sync after a successful login is still rejected', async () => {
    // e.g. the browser refused the session cookie: login says ok, but maindata keeps answering 403
    const maindata = vi.fn<(rid: number) => Promise<MaindataResponse>>().mockRejectedValue(new ApiError('auth', 403, ''));
    const { unmount } = render(App, { session: makeSession({ maindata }) });

    await userEvent.type(await screen.findByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));

    await vi.waitFor(() => expect(maindata).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'Log In' })).toBeEnabled();
    unmount();
  });
});
