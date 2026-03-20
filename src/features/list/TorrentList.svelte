<script lang="ts">
  import { getAppContext, menuContext, targetTorrents } from '../../app-context';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import { torrentMenu } from '../actions/torrent-menu';
  import GroupSection from './GroupSection.svelte';
  import NoResults from './NoResults.svelte';

  const app = getAppContext();
  const model = app.list;

  function rowFrom(event: MouseEvent): string | null {
    const target = event.target as Element;
    if (target.closest('button')) return null;
    return target.closest<HTMLElement>('[data-hash]')?.dataset.hash ?? null;
  }

  function onclick(event: MouseEvent) {
    const hash = rowFrom(event);
    if (hash) app.selection.click(hash, { shift: event.shiftKey, toggle: event.metaKey || event.ctrlKey }, model.order);
    // A plain click outside selection mode opens details; Ctrl/Shift-click selects.
    if (hash && !app.selection.mode && !event.shiftKey && !event.metaKey && !event.ctrlKey) app.details.open(hash);
  }

  function oncontextmenu(event: MouseEvent) {
    const hash = rowFrom(event);
    if (!hash) return;
    event.preventDefault();
    const inSelection = app.selection.mode && app.selection.has(hash);
    if (!app.selection.mode) app.selection.click(hash, { shift: false, toggle: false }, model.order);
    const torrent = app.session.torrents.get(hash);
    const targets = inSelection ? targetTorrents(app) : torrent ? [torrent] : [];
    app.selection.menuTarget = hash;
    app.popovers.openMenu(torrentMenu(targets, menuContext(app)), { x: event.clientX, y: event.clientY }, () => (app.selection.menuTarget = null));
  }
</script>

{#if model.torrents.size === 0}
  <StatusPage icon="magnet" title="No Torrents" description="Torrents you add will appear here." />
{:else if model.layout.groups.length === 0}
  <NoResults />
{:else}
  <!-- Rows are driven by pointer here; the keyboard equivalents are handled app-wide (see keyboard.ts). -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="page" {onclick} {oncontextmenu}>
    {#each model.layout.groups as group (group.key)}
      <GroupSection view={group} single={model.layout.single} oncollapse={() => model.toggleCollapsed(group)} onexpand={() => model.expand(group)} />
    {/each}
  </div>
{/if}

<style>
  .page { max-width: 860px; margin: 0 auto; padding: 12px 12px 24px; display: flex; flex-direction: column; gap: 24px; }
</style>
