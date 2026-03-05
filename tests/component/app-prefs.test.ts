import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import type { MaindataResponse } from '../../src/api/types';
import { Session } from '../../src/state/session.svelte';
import { fakeTorrentApi } from '../fixtures/fake-api';
import { fakeClientData } from '../fixtures/fake-clientdata';

const full: MaindataResponse = { rid: 1, full_update: true, torrents: { aaa: { name: 'ubuntu.iso', state: 'uploading', progress: 1 } }, server_state: {} };

describe('App preferences', () => {
  it('loads UI preferences from qBittorrent once connected', async () => {
    const clientdata = fakeClientData({ 'adwaita-ui': { view: 'list', listSort: 'name' } });
    const session = new Session({
      login: vi.fn(async () => 'ok' as const),
      logout: vi.fn(async () => {}),
      maindata: vi.fn(async (rid: number) => (rid === 0 ? full : { rid: 2 })),
      isHidden: () => false,
      onVisible: () => () => {},
    });
    const { unmount } = render(App, { session, api: fakeTorrentApi(), clientdata });
    expect(clientdata.load).not.toHaveBeenCalled();
    await screen.findByText('ubuntu.iso');
    await vi.waitFor(() => expect(clientdata.load).toHaveBeenCalledWith(['adwaita-ui']));
    expect(clientdata.load).toHaveBeenCalledTimes(1);
    unmount();
  });
});
