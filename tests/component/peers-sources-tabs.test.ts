import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { SvelteMap } from 'svelte/reactivity';
import { describe, expect, it } from 'vitest';
import type { Peer } from '../../src/api/details';
import PeersTab from '../../src/features/details/PeersTab.svelte';
import SourcesTab from '../../src/features/details/SourcesTab.svelte';
import { DEFAULT_PEER } from '../../src/sync/peers';
import { makeAppContext, withApp } from '../fixtures/app-context';

const peer = (overrides: Partial<Peer>): Peer => ({ ...DEFAULT_PEER, ...overrides });

describe('PeersTab', () => {
  it('shows an empty state once loaded without peers', () => {
    const app = makeAppContext([]);
    render(PeersTab, { props: { hash: 'h', peers: new SvelteMap<string, Peer>(), loaded: true }, context: withApp(app) });
    expect(screen.getByRole('heading', { name: 'No Connected Peers' })).toBeInTheDocument();
  });

  it('lists peers with flag, client and speeds, sorted by address', () => {
    const app = makeAppContext([]);
    const peers = new SvelteMap<string, Peer>([
      ['9.9.9.9:1', peer({ ip: '9.9.9.9', port: 1, client: 'Transmission 4.0', country_code: 'de', progress: 0.5, dl_speed: 2048 })],
      ['1.1.1.1:2', peer({ ip: '1.1.1.1', port: 2, client: 'qBittorrent 5.2', flags: 'D X', flags_desc: 'D = interested', progress: 1 })],
    ]);
    render(PeersTab, { props: { hash: 'h', peers, loaded: true }, context: withApp(app) });
    const rows = within(screen.getByRole('table', { name: 'Peers' })).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]!.textContent?.trim())).toEqual(['1.1.1.1:2', '🇩🇪 9.9.9.9:1']);
    expect(rows[1]).toHaveTextContent('Transmission 4.0');
    expect(rows[1]).toHaveTextContent('50.0%');
    expect(rows[1]).toHaveTextContent('2.0 kB/s');
  });

  it('copies, bans (after confirming) and adds peers', async () => {
    const app = makeAppContext([]);
    const peers = new SvelteMap<string, Peer>([['9.9.9.9:1', peer({ ip: '9.9.9.9', port: 1 })]]);
    render(PeersTab, { props: { hash: 'h', peers, loaded: true }, context: withApp(app) });
    await userEvent.click(screen.getByRole('button', { name: 'More for 9.9.9.9:1' }));
    { const item = app.popovers.current!.model.sections.flat().find((i) => i.label === 'Copy Address')!; app.popovers.close(); item.action!(); }
    expect(app.detailCommands.copyPeer).toHaveBeenCalledWith('9.9.9.9:1');
    await userEvent.click(screen.getByRole('button', { name: 'More for 9.9.9.9:1' }));
    { const item = app.popovers.current!.model.sections.flat().find((i) => i.label === 'Ban Peer…')!; app.popovers.close(); item.action!(); }
    (app.dialogs.stack.at(-1)!.props.onresponse as (id: string) => void)('ban');
    expect(app.detailCommands.banPeer).toHaveBeenCalledWith('9.9.9.9:1');
    await userEvent.click(screen.getByRole('button', { name: 'Add Peers' }));
    (app.dialogs.stack.at(-1)!.props.onconfirm as (text: string) => void)('1.2.3.4:5');
    expect(app.detailCommands.addPeers).toHaveBeenCalledWith('h', '1.2.3.4:5');
  });
});

describe('SourcesTab', () => {
  it('offers to add a web seed when there are none', async () => {
    const app = makeAppContext([]);
    render(SourcesTab, { props: { hash: 'h', webseeds: [] }, context: withApp(app) });
    expect(screen.getByRole('heading', { name: 'No HTTP Sources' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add Web Seeds…' }));
    (app.dialogs.stack.at(-1)!.props.onconfirm as (text: string) => void)('https://mirror.example/file');
    expect(app.detailCommands.addWebSeeds).toHaveBeenCalledWith('h', 'https://mirror.example/file');
  });

  it('edits and removes web seeds', async () => {
    const app = makeAppContext([]);
    render(SourcesTab, { props: { hash: 'h', webseeds: [{ url: 'https://a.example/x' }] }, context: withApp(app) });
    await userEvent.click(screen.getByRole('button', { name: 'More for https://a.example/x' }));
    { const item = app.popovers.current!.model.sections.flat().find((i) => i.label === 'Edit URL…')!; app.popovers.close(); item.action!(); }
    (app.dialogs.stack.at(-1)!.props.onconfirm as (v: string) => void)('https://b.example/x');
    expect(app.detailCommands.editWebSeed).toHaveBeenCalledWith('h', 'https://a.example/x', 'https://b.example/x');
    await userEvent.click(screen.getByRole('button', { name: 'More for https://a.example/x' }));
    { const item = app.popovers.current!.model.sections.flat().find((i) => i.label === 'Remove')!; app.popovers.close(); item.action!(); }
    expect(app.detailCommands.removeWebSeed).toHaveBeenCalledWith('h', 'https://a.example/x');
  });
});
