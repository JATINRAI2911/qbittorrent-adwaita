<script lang="ts">
  import type { Peer } from '../../api/details';
  import { getAppContext } from '../../app-context';
  import { formatBytes, formatCount, formatPercent, formatSpeed } from '../../lib/format';
  import { countryFlag } from '../../sync/peers';
  import AlertDialog from '../../ui/adw/AlertDialog.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import TextListDialog from './TextListDialog.svelte';

  let { hash, peers, loaded }: { hash: string; peers: ReadonlyMap<string, Peer>; loaded: boolean } = $props();

  const app = getAppContext();
  // Sorted by address, not speed: rows must not jump on every poll.
  const rows = $derived([...peers.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));

  function menu(id: string, event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          [{ label: 'Copy Address', action: () => void app.detailCommands.copyPeer(id) }],
          [
            {
              label: 'Ban Peer…',
              destructive: true,
              action: () =>
                app.dialogs.open(AlertDialog, {
                  heading: 'Ban Peer?',
                  body: 'qBittorrent will refuse connections from this address for all torrents. You can lift bans in Preferences.',
                  responses: [
                    { id: 'cancel', label: 'Cancel' },
                    { id: 'ban', label: 'Ban', variant: 'destructive' },
                  ],
                  onresponse: (response: string) => response === 'ban' && void app.detailCommands.banPeer(id),
                }),
            },
          ],
        ],
      },
      event.currentTarget as HTMLElement,
      'end',
    );
  }

  function addPeers() {
    app.dialogs.open(TextListDialog, {
      title: 'Add Peers',
      label: 'Peers',
      placeholder: '203.0.113.7:51413',
      description: 'IP:port, one per line. IPv6 addresses go in brackets: [2001:db8::1]:51413.',
      confirmLabel: 'Add',
      onconfirm: (text: string) => void app.detailCommands.addPeers(hash, text),
    });
  }
</script>

{#if !loaded}
  <div class="tab-loading"><Spinner size={24} label="Loading peers" /></div>
{:else if rows.length === 0}
  <StatusPage compact icon="peers" title="No Connected Peers" description="Peers appear here while the torrent is running.">
    <Button pill label="Add Peers…" onclick={addPeers} />
  </StatusPage>
{:else}
  <section class="pref-group">
    <div class="pg-header">
      <div><h3 class="heading">{formatCount(rows.length)} {rows.length === 1 ? 'Peer' : 'Peers'}</h3></div>
      <Button variant="flat" icon="list-add" title="Add Peers" onclick={addPeers} />
    </div>
    <div class="boxed-list peer-table" role="table" aria-label="Peers">
      <div class="pt-h" role="row">
        <span role="columnheader">Address</span><span role="columnheader">Client</span><span role="columnheader">Connection</span><span role="columnheader">Flags</span>
        <span role="columnheader" class="end">Progress</span><span role="columnheader" class="end">Relevance</span><span role="columnheader" class="end">Down</span><span role="columnheader" class="end">Up</span>
        <span role="columnheader" class="end">Downloaded</span><span role="columnheader" class="end">Uploaded</span><span role="columnheader"><span class="visually-hidden">Actions</span></span>
      </div>
      {#each rows as id (id)}
        {@const p = peers.get(id)!}
        <div class="pt-r" role="row">
          <span role="cell" class="monospace ellipsis">{countryFlag(p.country_code)}{p.country_code ? ' ' : ''}{id}</span>
          <span role="cell" class="ellipsis dimmed">{p.client}</span>
          <span role="cell" class="dimmed">{p.connection}</span>
          <span role="cell" class="monospace dimmed" title={p.flags_desc}>{p.flags}</span>
          <span role="cell" class="end numeric">{formatPercent(p.progress)}</span>
          <span role="cell" class="end numeric dimmed">{formatPercent(p.relevance)}</span>
          <span role="cell" class="end numeric">{p.dl_speed > 0 ? formatSpeed(p.dl_speed) : '–'}</span>
          <span role="cell" class="end numeric">{p.up_speed > 0 ? formatSpeed(p.up_speed) : '–'}</span>
          <span role="cell" class="end numeric">{formatBytes(p.downloaded)}</span>
          <span role="cell" class="end numeric">{formatBytes(p.uploaded)}</span>
          <span role="cell">
            <button type="button" class="btn flat image-button circular" aria-label="More for {id}" aria-haspopup="menu" onclick={(event) => menu(id, event)}><Icon name="view-more" /></button>
          </span>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .peer-table { overflow-x: auto; }
  .pt-h, .pt-r {
    display: grid; grid-template-columns: minmax(180px, 1.4fr) minmax(140px, 1.2fr) 90px 70px 80px 80px 90px 90px 100px 100px 40px;
    gap: 12px; padding: 0 14px; align-items: center; min-width: 980px;
  }
  .pt-h { min-height: 34px; font-weight: 700; font-size: 82%; color: color-mix(in srgb, currentColor var(--dim-opacity), transparent); }
  .pt-r { min-height: 44px; border-top: 1px solid var(--card-shade-color); }
  .end { text-align: right; }
</style>
