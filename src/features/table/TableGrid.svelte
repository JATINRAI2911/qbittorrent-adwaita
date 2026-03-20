<script lang="ts">
  import { untrack } from 'svelte';
  import { getAppContext, menuContext, targetTorrents } from '../../app-context';
  import Icon from '../../ui/adw/Icon.svelte';
  import type { MenuModel } from '../../ui/adw/menu';
  import { torrentMenu } from '../actions/torrent-menu';
  import { COLUMN_IDS, COLUMNS, gridMinWidth, gridTemplate, type ColumnId } from './columns';
  import TableRow from './TableRow.svelte';
  import { scrollToReveal, virtualWindow } from './virtual';

  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 30;

  const app = getAppContext();
  const table = app.table;

  let scroller: HTMLDivElement;
  let scrollTop = $state(0);
  // jsdom and the first frame have no layout: assume a typical viewport until measured.
  let viewport = $state(600);

  const columns = $derived(app.prefs.columns);
  const sort = $derived(app.prefs.tableSort);
  const template = $derived(gridTemplate(columns));
  const win = $derived(virtualWindow({ scrollTop, viewportHeight: viewport, rowHeight: ROW_HEIGHT, count: table.rows.length }));
  const visible = $derived(table.rows.slice(win.start, win.end));

  $effect(() => {
    const measure = () => (viewport = scroller.clientHeight || 600);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(scroller);
    return () => observer?.disconnect();
  });

  // The keyboard moved focus: bring that row into view.
  $effect(() => {
    const hash = table.revealHash;
    if (!hash) return;
    untrack(() => {
      const index = table.order.indexOf(hash);
      if (index >= 0) {
        scroller.scrollTop = scrollToReveal({ index, scrollTop: scroller.scrollTop, viewportHeight: viewport, rowHeight: ROW_HEIGHT, headerHeight: HEADER_HEIGHT });
        scrollTop = scroller.scrollTop;
      }
      table.revealHash = null;
    });
  });

  // A new filter starts at the top.
  $effect(() => {
    void app.list.filterKey;
    untrack(() => {
      scroller.scrollTop = 0;
      scrollTop = 0;
    });
  });

  function sortBy(id: ColumnId) {
    app.prefs.setTableSort(sort.column === id ? { column: id, descending: !sort.descending } : { column: id, descending: COLUMNS[id].defaultDescending });
  }

  function columnsMenu(): MenuModel {
    return {
      title: 'Columns',
      sections: [COLUMN_IDS.filter((id) => id !== 'name').map((id) => ({ label: COLUMNS[id].title, checked: columns.includes(id), action: () => app.prefs.toggleColumn(id) }))],
    };
  }

  function rowFrom(event: MouseEvent): string | null {
    const target = event.target as Element;
    if (target.closest('button')) return null;
    return target.closest<HTMLElement>('[data-hash]')?.dataset.hash ?? null;
  }

  function onclick(event: MouseEvent) {
    const hash = rowFrom(event);
    if (hash) app.selection.click(hash, { shift: event.shiftKey, toggle: event.metaKey || event.ctrlKey }, table.order);
    // A plain click outside selection mode opens details; Ctrl/Shift-click selects.
    if (hash && !app.selection.mode && !event.shiftKey && !event.metaKey && !event.ctrlKey) app.details.open(hash);
  }

  function oncontextmenu(event: MouseEvent) {
    const hash = rowFrom(event);
    if (!hash) return;
    event.preventDefault();
    const inSelection = app.selection.mode && app.selection.has(hash);
    if (!app.selection.mode) app.selection.click(hash, { shift: false, toggle: false }, table.order);
    const torrent = app.session.torrents.get(hash);
    const targets = inSelection ? targetTorrents(app) : torrent ? [torrent] : [];
    app.selection.menuTarget = hash;
    app.popovers.openMenu(torrentMenu(targets, menuContext(app)), { x: event.clientX, y: event.clientY }, () => (app.selection.menuTarget = null));
  }
</script>

<div
  class="columnview"
  class:scrolled={scrollTop > 0}
  role="grid"
  tabindex="-1"
  aria-label="Torrents"
  aria-rowcount={table.rows.length + 1}
  bind:this={scroller}
  onscroll={(event) => (scrollTop = event.currentTarget.scrollTop)}
>
  <div class="cv-inner" style:min-width="{gridMinWidth(columns)}px">
    <div
      class="cv-header"
      role="row"
      tabindex="-1"
      aria-rowindex={1}
      style:grid-template-columns={template}
      oncontextmenu={(event) => {
        event.preventDefault();
        app.popovers.openMenu(columnsMenu(), { x: event.clientX, y: event.clientY });
      }}
    >
      {#each columns as id (id)}
        <div role="columnheader" aria-sort={sort.column === id ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
          <button type="button" class="cv-h" class:end={COLUMNS[id].align === 'end'} onclick={() => sortBy(id)}>
            {COLUMNS[id].title}{#if sort.column === id}<Icon name={sort.descending ? 'pan-down' : 'pan-up'} class="sort-i" />{/if}
          </button>
        </div>
      {/each}
    </div>
    <!-- Rows are driven by pointer here; the keyboard equivalents are handled app-wide (see keyboard.ts). -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="cv-body" style:height="{win.total}px" {onclick} {oncontextmenu}>
      <div class="cv-rows" style:transform="translateY({win.offset}px)">
        {#each visible as t, i (t.hash)}
          <TableRow torrent={t} {columns} {template} index={win.start + i} />
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .columnview { height: 100%; overflow: auto; background: var(--view-bg-color); color: var(--view-fg-color); outline: none; }
  .cv-inner { width: 100%; }
  .cv-header { position: sticky; top: 0; z-index: 2; display: grid; padding: 0 6px; background: var(--view-bg-color); transition: box-shadow 200ms var(--ease-out-quad); }
  .scrolled .cv-header { box-shadow: 0 1px color-mix(in srgb, var(--shade-color) 75%, transparent); }
  .cv-h {
    width: 100%; min-height: 30px; padding: 3px 6px; border: 0; background: none; display: flex; align-items: center; gap: 6px;
    font: inherit; font-weight: 700; font-size: 82%; line-height: 100%; white-space: nowrap; cursor: default;
    color: color-mix(in srgb, currentColor 40%, transparent);
  }
  .cv-h:hover { color: color-mix(in srgb, currentColor 70%, transparent); }
  .cv-h:active { color: currentColor; }
  .cv-h.end { justify-content: flex-end; }
  .cv-h :global(.sort-i) { width: 16px; height: 16px; }
  .cv-body { position: relative; }
  .cv-rows { position: absolute; inset: 0 0 auto 0; }
  :global(.cv-row) { display: grid; height: 36px; align-items: center; padding: 0 6px; transition: background-color 200ms var(--ease-out-quad); }
  :global(.cv-row:hover) { background: var(--view-hover-color); }
  :global(.cv-row:active) { background: var(--view-active-color); }
  :global(.cv-row.selected) { background: var(--view-selected-color); }
  :global(.cv-row.selected:hover) { background: var(--view-selected-hover-color); }
  :global(.cv-row.menu-target:not(.selected)) { background: var(--view-hover-color); }
  :global(.cv-row.kfocus) { outline: 2px solid var(--focus-ring-color); outline-offset: -2px; }
  :global(.cv-row.inactive .cv-c.name .ellipsis) { color: color-mix(in srgb, var(--view-fg-color) 50%, transparent); }
  :global(.cv-c) { padding: 0 6px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :global(.cv-c.end) { text-align: right; }
  :global(.cv-c.name) { display: flex; align-items: center; gap: 10px; }
  :global(.cv-c.name .ellipsis) { overflow: hidden; text-overflow: ellipsis; }
  :global(.cv-c.progress) { display: flex; align-items: center; gap: 8px; }
  :global(.cv-c.progress .progressbar) { flex: 1; }
  :global(.cv-c .pct) { font-size: smaller; opacity: var(--dim-opacity); width: 42px; text-align: right; }
</style>
