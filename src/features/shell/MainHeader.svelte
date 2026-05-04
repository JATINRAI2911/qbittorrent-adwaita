<script lang="ts">
  import type { ServerState, Torrent } from '../../api/types';
  import { getAppContext, viewHashes } from '../../app-context';
  import { formatCount } from '../../lib/format';
  import { LIST_SORTS } from '../../state/groups';
  import { HEALTHY, type Health } from '../../state/health';
  import { subtitleText, summarize } from '../../state/summary';
  import Button from '../../ui/adw/Button.svelte';
  import HeaderBar from '../../ui/adw/HeaderBar.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import type { MenuModel } from '../../ui/adw/menu';
  import WindowTitle from '../../ui/adw/WindowTitle.svelte';
  import StatusPopover from '../global/StatusPopover.svelte';
  import { COLUMN_IDS, COLUMNS } from '../table/columns';

  interface Props {
    torrents: ReadonlyMap<string, Torrent>;
    server: Partial<ServerState>;
    offline: boolean;
    health?: Health;
  }
  let { torrents, server, offline, health = HEALTHY }: Props = $props();

  const app = getAppContext();
  const subtitle = $derived(subtitleText(summarize(torrents.values(), server), { offline, empty: torrents.size === 0 }));
  const count = $derived(app.selection.size);
  const alt = $derived(server.use_alt_speed_limits ?? false);
  const STATUS_ICON = { ok: 'network', warning: 'warning', error: 'exclamation' } as const;

  function openMainMenu(event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          [
            { label: 'Manage Categories…', action: () => app.openers.manageCategories() },
            { label: 'Manage Tags…', action: () => app.openers.manageTags() },
          ],
          [{ label: 'Log Out', action: () => void app.session.logout().then(() => app.selection.exit()) }],
        ],
      },
      event.currentTarget as HTMLElement,
      'end',
    );
  }

  function openSelectionMenu(event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          [
            { label: 'Select All', accel: 'Ctrl+A', action: () => app.selection.selectAll(viewHashes(app)) },
            { label: 'Select None', action: () => app.selection.selected.clear() },
          ],
        ],
      },
      event.currentTarget as HTMLElement,
    );
  }

  const table = $derived(app.prefs.view === 'table');

  function viewMenu(): MenuModel {
    if (!table) {
      return { sections: [LIST_SORTS.map((s) => ({ label: s.label, checked: app.prefs.listSort === s.value, action: () => app.prefs.setListSort(s.value) }))] };
    }
    const sort = app.prefs.tableSort;
    return {
      sections: [
        [
          {
            label: 'Columns',
            submenu: () => ({
              title: 'Columns',
              sections: [
                COLUMN_IDS.filter((id) => id !== 'name').map((id) => ({
                  label: COLUMNS[id].title,
                  checked: app.prefs.columns.includes(id),
                  action: () => app.prefs.toggleColumn(id),
                })),
              ],
            }),
          },
        ],
        [
          { label: 'Ascending', checked: !sort.descending, action: () => app.prefs.setTableSort({ ...sort, descending: false }) },
          { label: 'Descending', checked: sort.descending, action: () => app.prefs.setTableSort({ ...sort, descending: true }) },
        ],
      ],
    };
  }

  function toggleSearch() {
    if (app.list.searchOpen) app.list.closeSearch();
    else app.list.openSearch();
  }
</script>

{#if app.selection.mode}
  <HeaderBar>
    {#snippet start()}<Button label="Cancel" onclick={() => app.selection.exit()} />{/snippet}
    {#snippet title()}
      <button type="button" class="btn flat title-menu" aria-haspopup="menu" onclick={openSelectionMenu}>
        <span class="heading">{count ? `${formatCount(count)} Selected` : 'Click on Items to Select Them'}</span>
        <Icon name="pan-down" />
      </button>
    {/snippet}
  </HeaderBar>
{:else}
  <HeaderBar>
    {#snippet start()}
      <Button icon="list-add" title="Add Torrents" onclick={() => app.openers.add()} />
      <button
        type="button"
        class="btn image-button"
        class:checked={alt}
        aria-pressed={alt}
        aria-label="Alternative Speed Limits"
        title="Alternative Speed Limits"
        disabled={offline}
        onclick={() => void app.global.commands.setAltSpeed(!alt)}
      ><Icon name="turtle" /></button>
      <button
        type="button"
        class="btn image-button status-button tone-{health.level}"
        aria-label="Status: {health.line}"
        title="Status"
        aria-haspopup="dialog"
        aria-expanded={app.popovers.panel?.component === StatusPopover}
        onclick={(event) => app.popovers.togglePanel(StatusPopover, { health: () => health }, event.currentTarget, 'start')}
      ><Icon name={STATUS_ICON[health.level]} /></button>
    {/snippet}
    {#snippet title()}<WindowTitle title="qBittorrent" {subtitle} />{/snippet}
    {#snippet end()}
      <Button icon="open-menu" title="Main Menu" onclick={openMainMenu} />
      <div class="split-button">
        <Button icon={table ? 'view-list' : 'view-columns'} title={table ? 'List View' : 'Table View'} onclick={() => app.prefs.setView(table ? 'list' : 'table')} />
        <button type="button" class="btn image-button arrow" aria-label="View Options" aria-haspopup="menu" onclick={(event) => app.popovers.toggleMenu(viewMenu(), event.currentTarget, 'end')}>
          <Icon name="pan-down" />
        </button>
      </div>
      <button type="button" class="btn image-button" class:checked={app.list.searchOpen} aria-label="Search" title="Search" aria-pressed={app.list.searchOpen} onclick={toggleSearch}>
        <Icon name="search" />
      </button>
      <Button icon="selection-mode" title="Select" onclick={() => app.selection.enter()} />
    {/snippet}
  </HeaderBar>
{/if}

<style>
  .status-button.tone-warning { color: var(--warning-color); }
  .status-button.tone-error { color: var(--error-color); }
</style>
