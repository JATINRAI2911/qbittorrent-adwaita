<script lang="ts">
  import { focusRow } from '../list/focus-row';
  import { DURATION, fade } from '../../ui/adw/motion';
  import { getAppContext, menuContext } from '../../app-context';
  import { needsStart } from '../../lib/torrent-state';
  import BottomSheet from '../../ui/adw/BottomSheet.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import ToggleGroup from '../../ui/adw/ToggleGroup.svelte';
  import { torrentMenu } from '../actions/torrent-menu';
  import Bubble from '../list/Bubble.svelte';
  import { describeRow, etaText } from '../list/describe';
  import { DETAIL_TABS } from './details.svelte';
  import FilesTab from './FilesTab.svelte';
  import OverviewTab from './OverviewTab.svelte';
  import PeersTab from './PeersTab.svelte';
  import SourcesTab from './SourcesTab.svelte';
  import TrackersTab from './TrackersTab.svelte';

  const app = getAppContext();
  const details = app.details;
  const t = $derived(details.hash ? app.session.torrents.get(details.hash) : undefined);
  const status = $derived(t ? [...describeRow(t).map((s) => s.text), etaText(t)].filter(Boolean).join(' · ') : '');
  const stopped = $derived(t ? needsStart(t) : false);
  const tabs = $derived(DETAIL_TABS.map((tab) => (tab.value === 'trackers' && t?.has_tracker_error ? { ...tab, badge: 'has errors' } : tab)));

  // Closing or minimizing hands focus back to the torrent's row instead of dropping it to the page.
  function back(change: () => void) {
    const hash = details.hash;
    change();
    if (hash) focusRow(hash);
  }
</script>

{#if t && details.sheet !== 'closed'}
  <BottomSheet
    mode={details.sheet === 'bar' ? 'bar' : 'open'}
    height={app.prefs.sheetHeight}
    label="Details"
    onresize={(fraction) => app.prefs.setSheetHeight(fraction)}
    oncollapse={() => details.minimize()}
  >
    {#snippet bar()}
      <button type="button" class="bar-open" onclick={() => details.expand()}>
        <Bubble torrent={t} />
        <span class="title-box"><span class="heading ellipsis" dir="auto">{t.name}</span><span class="subtitle numeric ellipsis">{status}</span></span>
      </button>
      <Button variant="flat" circular icon={stopped ? 'play' : 'pause'} title={stopped ? 'Start' : 'Stop'} onclick={() => void app.commands.toggle([t])} />
      <Button variant="flat" icon="pan-up" title="Expand" onclick={() => details.expand()} />
      <Button variant="flat" icon="close" title="Close" onclick={() => back(() => details.close())} />
    {/snippet}

    {#snippet head()}
      <div class="sheet-head">
        <Bubble torrent={t} />
        <div class="title-box">
          <h2 class="title-4 sheet-name ellipsis" dir="auto">{t.name}</h2>
          <span class="subtitle numeric ellipsis">{status}</span>
        </div>
        <Button icon={stopped ? 'play' : 'pause'} label={stopped ? 'Start' : 'Stop'} onclick={() => void app.commands.toggle([t])} />
        <Button variant="flat" icon="view-more" title="More" haspopup="menu" onclick={(event) => app.popovers.toggleMenu(torrentMenu([t], menuContext(app)), event.currentTarget as HTMLElement, 'end')} />
        <Button variant="flat" icon="pan-down" title="Minimize" onclick={() => back(() => details.minimize())} />
        <Button variant="flat" icon="close" title="Close" onclick={() => back(() => details.close())} />
      </div>
      <div class="sheet-tabs"><ToggleGroup label="Details sections" options={tabs} value={details.tab} onchange={(tab) => details.setTab(tab)} /></div>
    {/snippet}

    <div class="sheet-clamp">
      {#if details.error}<p class="sheet-error error" role="status">Couldn’t refresh: {details.error}</p>{/if}
      <!-- Keyed by torrent: filters, collapsed folders and other tab state belong to one torrent. -->
      {#key t.hash}
      <!-- AdwViewStack-style crossfade between tabs. -->
      {#key details.tab}
      <div class="tab-body" in:fade={{ duration: DURATION.normal }}>
      {#if details.tab === 'overview'}
        <OverviewTab torrent={t} properties={details.properties} pieces={details.pieces} />
      {:else if details.tab === 'files'}
        <FilesTab hash={t.hash} files={details.files} />
      {:else if details.tab === 'trackers'}
        <TrackersTab torrent={t} trackers={details.trackers} />
      {:else if details.tab === 'peers'}
        <PeersTab hash={t.hash} peers={details.peers} loaded={details.peersLoaded} />
      {:else}
        <SourcesTab hash={t.hash} webseeds={details.webseeds} />
      {/if}
      </div>
      {/key}
      {/key}
    </div>
  </BottomSheet>
{/if}

<style>
  .sheet-head { display: flex; align-items: center; gap: 12px; padding: 0 12px 12px 24px; }
  .sheet-head .title-box { flex: 1; min-width: 0; margin: 0; }
  .sheet-name { margin: 0; user-select: text; }
  .sheet-tabs { display: flex; justify-content: center; padding: 0 12px 6px; }
  .sheet-clamp { max-width: 1180px; margin: 0 auto; padding: 18px 24px 32px; }
  .sheet-error { margin: 0 4px 12px; }
  .bar-open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 18px; border: 0; background: none; text-align: left; font: inherit; color: inherit; border-radius: 15px 0 0 0; height: 100%; }
  .bar-open:hover { background: var(--view-hover-color); }
  .bar-open .title-box { min-width: 0; margin: 0; }
  .title-box .subtitle { font-size: smaller; opacity: var(--dim-opacity); }
</style>
