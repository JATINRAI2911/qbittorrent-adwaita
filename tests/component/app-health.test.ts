import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import type { MaindataResponse, ServerState } from '../../src/api/types';
import { Session } from '../../src/state/session.svelte';
import { fakeAddApi } from '../fixtures/fake-add-api';
import { fakeAppApi } from '../fixtures/fake-app-api';
import { fakeTorrentApi } from '../fixtures/fake-api';
import { fakeClientData } from '../fixtures/fake-clientdata';
import { fakeDetailsApi } from '../fixtures/fake-details-api';

const GiB = 1024 ** 3;

async function renderApp(server: Partial<ServerState>, prefs: Record<string, unknown> = { save_path: '/data', listen_port: 51413 }) {
  const full: MaindataResponse = { rid: 1, full_update: true, torrents: { aaa: { name: 'a.iso', state: 'downloading', progress: 0.5, amount_left: GiB } }, server_state: server };
  const session = new Session({ login: vi.fn(async () => 'ok' as const), logout: vi.fn(async () => {}), maindata: vi.fn(async (rid: number) => (rid === 0 ? full : { rid: 2 })), isHidden: () => false, onVisible: () => () => {} });
  const appClient = fakeAppApi(prefs);
  const view = render(App, { session, api: fakeTorrentApi(), clientdata: fakeClientData(), details: fakeDetailsApi(), appClient, add: fakeAddApi() });
  await screen.findByRole('banner');
  return { appClient, ...view };
}

describe('health banner', () => {
  it('says incoming connections are blocked and names the listen port', async () => {
    const { appClient, unmount } = await renderApp({ connection_status: 'firewalled', free_space_on_disk: 500 * GiB });
    expect(await screen.findByText('Incoming connections are blocked. Port 51413 isn’t reachable, so fewer peers can connect.')).toBeInTheDocument();
    expect(appClient.preferences).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('warns about low disk space and shows the downloads', async () => {
    const { unmount } = await renderApp({ connection_status: 'connected', free_space_on_disk: 2 * GiB });
    expect(await screen.findByText('Only 2.1 GB free on /data. Downloads will stop when the disk is full.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show Downloading' }));
    expect(screen.getByRole('radio', { name: 'Downloading' })).toBeChecked();
    unmount();
  });

  it('shows nothing when healthy', async () => {
    const { unmount } = await renderApp({ connection_status: 'connected', free_space_on_disk: 500 * GiB });
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
  });

  it('opens Preferences on the Connection page from the firewall banner', async () => {
    const { unmount } = await renderApp({ connection_status: 'firewalled', free_space_on_disk: 500 * GiB });
    await userEvent.click(await screen.findByRole('button', { name: 'Connection Settings' }));
    expect(await screen.findByRole('dialog', { name: 'Preferences' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Listening Port' })).toBeInTheDocument();
    unmount();
  });
});
