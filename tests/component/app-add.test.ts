import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.svelte';
import type { MaindataResponse } from '../../src/api/types';
import { Session } from '../../src/state/session.svelte';
import { fakeAddApi } from '../fixtures/fake-add-api';
import { fakeTorrentApi } from '../fixtures/fake-api';
import { fakeClientData } from '../fixtures/fake-clientdata';
import { fakeDetailsApi } from '../fixtures/fake-details-api';

const MAGNET = `magnet:?xt=urn:btih:${'ab'.repeat(20)}&dn=Ubuntu`;

async function renderApp(torrents: MaindataResponse['torrents'] = { aaa: { name: 'first.iso', state: 'uploading', progress: 1 } }) {
  const full: MaindataResponse = { rid: 1, full_update: true, torrents, server_state: {} };
  const session = new Session({ login: vi.fn(async () => 'ok' as const), logout: vi.fn(async () => {}), maindata: vi.fn(async (rid: number) => (rid === 0 ? full : { rid: 2 })), isHidden: () => false, onVisible: () => () => {} });
  const add = fakeAddApi();
  const appClient = { directoryContent: vi.fn(async () => []), defaultSavePath: vi.fn(async () => '/dl'), preferences: vi.fn(async () => ({})), setPreferences: vi.fn(async () => {}) };
  const view = render(App, { session, api: fakeTorrentApi(), clientdata: fakeClientData(), details: fakeDetailsApi(), appClient, add });
  await screen.findByRole('banner');
  return { add, ...view };
}

const paste = (text: string, target: EventTarget = document.body) => {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', { value: { getData: (type: string) => (type === 'text/plain' || type === 'text' ? text : ''), files: [] } });
  target.dispatchEvent(event);
  return event;
};

describe('App add entry points', () => {
  it('opens Add Torrents from the header button and Ctrl/Cmd+O', async () => {
    const { unmount } = await renderApp();
    await userEvent.click(screen.getByRole('button', { name: 'Add Torrents' }));
    expect(screen.getByRole('dialog', { name: 'Add Torrents' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Control>}o{/Control}');
    expect(screen.getByRole('dialog', { name: 'Add Torrents' })).toBeInTheDocument();
    unmount();
  });

  it('adds a magnet pasted anywhere', async () => {
    const { unmount } = await renderApp();
    const event = paste(`look ${MAGNET}`);
    expect(event.defaultPrevented).toBe(true);
    expect(await screen.findByText('Ubuntu')).toBeInTheDocument();
    unmount();
  });

  it('leaves pastes into text fields, pastes without links, and pastes over dialogs alone', async () => {
    const { unmount } = await renderApp();
    await userEvent.keyboard('{Control>}f{/Control}');
    const search = screen.getByRole('searchbox', { name: 'Search torrents' });
    expect(paste(MAGNET, search).defaultPrevented).toBe(false);
    (document.activeElement as HTMLElement | null)?.blur();
    expect(paste('hello there').defaultPrevented).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
  });

  it('shows a drop hint and adds dropped .torrent files', async () => {
    const { add, unmount } = await renderApp();
    const file = new File(['1'], 'debian.torrent');
    const data = { types: ['Files'], files: [file, new File(['x'], 'notes.txt')], getData: () => '' };
    await fireEvent.dragEnter(window, { dataTransfer: data });
    expect(screen.getByText('Drop to Add Torrents')).toBeInTheDocument();
    await fireEvent.drop(window, { dataTransfer: data });
    expect(screen.queryByText('Drop to Add Torrents')).toBeNull();
    expect(await screen.findByRole('dialog', { name: 'Add Torrents' })).toBeInTheDocument();
    expect(add.parseMetadata).toHaveBeenCalledWith([file]);
    unmount();
  });

  it('offers Add Torrents on the empty list', async () => {
    const { unmount } = await renderApp({});
    expect(screen.getByText('Drop .torrent files here, or paste a magnet link.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add Torrents…' }));
    expect(screen.getByRole('dialog', { name: 'Add Torrents' })).toBeInTheDocument();
    unmount();
  });

  it('never lets a dropped file navigate away, even over a dialog', async () => {
    const { add, unmount } = await renderApp();
    await userEvent.click(screen.getByRole('button', { name: 'Add Torrents' }));
    const data = { types: ['Files'], files: [new File(['1'], 'debian.torrent')], getData: () => '' };
    const over = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(over, 'dataTransfer', { value: data });
    window.dispatchEvent(over);
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: data });
    window.dispatchEvent(drop);
    expect([over.defaultPrevented, drop.defaultPrevented]).toEqual([true, true]);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(add.parseMetadata).not.toHaveBeenCalled();
    unmount();
  });

  it('handles a file dropped on a text field and clears the drop hint, but leaves link drops to the field', async () => {
    const { add, unmount } = await renderApp();
    await userEvent.keyboard('{Control>}f{/Control}');
    const search = screen.getByRole('searchbox', { name: 'Search torrents' });
    const fire = (type: string, data: object, target: EventTarget) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: data });
      target.dispatchEvent(event);
      return event;
    };
    const link = { types: ['text/uri-list'], files: [], getData: () => 'https://x.example/a.torrent' };
    expect(fire('dragover', link, search).defaultPrevented).toBe(false);
    const file = new File(['1'], 'debian.torrent');
    const files = { types: ['Files'], files: [file], getData: () => '' };
    fire('dragenter', files, window);
    expect(await screen.findByText('Drop to Add Torrents')).toBeInTheDocument();
    expect(fire('dragover', files, search).defaultPrevented).toBe(true);
    expect(fire('drop', files, search).defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(screen.queryByText('Drop to Add Torrents')).toBeNull());
    expect(await screen.findByRole('dialog', { name: 'Add Torrents' })).toBeInTheDocument();
    expect(add.parseMetadata).toHaveBeenCalledWith([file]);
    unmount();
  });
});
