<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import type { TorrentFile } from '../../api/details';
  import { getAppContext } from '../../app-context';
  import { formatBytes, formatCount, formatPercent } from '../../lib/format';
  import CheckButton from '../../ui/adw/CheckButton.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import SearchEntry from '../../ui/adw/SearchEntry.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import { virtualWindow } from '../table/virtual';
  import { fileRows, PRIORITY_LABEL, selectedSize, type FileNode, type PriorityName } from './files';
  import TextDialog from './TextDialog.svelte';

  let { hash, files }: { hash: string; files: TorrentFile[] | null } = $props();

  const app = getAppContext();
  const collapsed = new SvelteSet<string>();
  let query = $state('');
  const rows = $derived(files ? fileRows(files, { collapsed, query }) : []);
  const total = $derived(files ? files.reduce((sum, file) => sum + file.size, 0) : 0);
  const PRIORITIES: PriorityName[] = ['skip', 'normal', 'high', 'maximum'];

  // Torrents with thousands of files render only the rows in view (plus overscan). The sheet body
  // scrolls, not this list, so the window is its scroll position less where the list starts in it.
  const ROW = 48;
  const VIRTUAL_FROM = 200;
  let list = $state<HTMLElement>();
  let scrollTop = $state(0);
  let viewport = $state(0);
  const virtual = $derived(rows.length > VIRTUAL_FROM);
  const win = $derived(
    virtual ? virtualWindow({ scrollTop, viewportHeight: viewport, rowHeight: ROW, count: rows.length }) : { start: 0, end: rows.length, offset: 0, total: 0 },
  );
  const shown = $derived(virtual ? rows.slice(win.start, win.end) : rows);

  $effect(() => {
    const el = list;
    if (!el) return;
    const scroller = el.closest<HTMLElement>('.sheet-body');
    let listTop = 0;
    const measure = () => {
      viewport = scroller?.clientHeight || 400;
      if (scroller) listTop = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scrollTop = scroller ? scroller.scrollTop - listTop : 0;
    };
    const onscroll = () => (scrollTop = scroller!.scrollTop - listTop);
    measure();
    scroller?.addEventListener('scroll', onscroll, { passive: true });
    // Measured like the table view: ResizeObserver where there is one (jsdom has none).
    const observer = scroller && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(scroller!);
    return () => {
      scroller?.removeEventListener('scroll', onscroll);
      observer?.disconnect();
    };
  });

  function toggleCheck(node: FileNode) {
    if (!files) return;
    void app.detailCommands.setPriority(hash, files, node.ids, node.check === true ? 'skip' : 'normal');
  }

  function priorityMenu(node: FileNode, event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          PRIORITIES.map((priority) => ({
            label: PRIORITY_LABEL[priority],
            checked: node.priority === priority,
            radio: true,
            // Read `files` when chosen: a poll may have replaced the list since the menu opened.
            action: () => files && void app.detailCommands.setPriority(hash, files, node.ids, priority),
          })),
        ],
      },
      event.currentTarget as HTMLElement,
      'end',
    );
  }

  function rowMenu(node: FileNode, event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          [
            {
              label: 'Rename…',
              action: () =>
                app.dialogs.open(TextDialog, {
                  title: node.kind === 'folder' ? 'Rename Folder' : 'Rename File',
                  label: 'Name',
                  value: node.name,
                  confirmLabel: 'Rename',
                  validate: (value: string) => (value.includes('/') ? 'Names can’t contain “/”.' : null),
                  onconfirm: (value: string) => void app.detailCommands.renamePath(hash, node, value),
                }),
            },
          ],
        ],
      },
      event.currentTarget as HTMLElement,
      'end',
    );
  }
</script>

{#if files === null}
  <div class="tab-loading"><Spinner size={24} label="Loading files" /></div>
{:else}
  <section class="pref-group">
    <div class="pg-header">
      <div>
        <h3 class="heading">{formatCount(files.length)} {files.length === 1 ? 'File' : 'Files'}</h3>
        <p class="pg-desc numeric">{formatBytes(selectedSize(files))} of {formatBytes(total)} selected</p>
      </div>
      {#if files.length > 20 || query}<div class="files-filter"><SearchEntry label="Filter files" placeholder="Filter files" bind:value={query} /></div>{/if}
    </div>
    <div class="boxed-list" role="list" aria-label="Files" bind:this={list}>
      {#if win.offset > 0}<div class="files-spacer" style:height="{win.offset}px" aria-hidden="true"></div>{/if}
      {#each shown as node, i (node.path)}
        <div class="row file-row" role="listitem" aria-setsize={rows.length} aria-posinset={win.start + i + 1} style:--depth={node.depth}>
          {#if node.kind === 'folder'}
            <button
              type="button"
              class="btn flat image-button circular chevron"
              aria-label="{collapsed.has(node.path) ? 'Expand' : 'Collapse'} {node.name}"
              aria-expanded={!collapsed.has(node.path)}
              onclick={() => (collapsed.has(node.path) ? collapsed.delete(node.path) : collapsed.add(node.path))}
            >
              <Icon name={collapsed.has(node.path) ? 'pan-end' : 'pan-down'} />
            </button>
          {:else}
            <span class="chevron-spacer"></span>
          {/if}
          <CheckButton checked={node.check} label="Download {node.name}" onclick={() => toggleCheck(node)} />
          <Icon name={node.kind === 'folder' ? 'folder' : 'file'} class="dimmed" />
          <span class="file-name ellipsis" class:heading={node.kind === 'folder'} dir="auto">{node.name}</span>
          <span class="file-value numeric dimmed">{node.check === false ? '–' : formatPercent(node.progress)} · {formatBytes(node.size)}</span>
          <button
            type="button"
            class="btn flat dropdown prio-btn"
            class:skip={node.priority === 'skip'}
            aria-haspopup="menu"
            aria-label="Priority of {node.name}: {PRIORITY_LABEL[node.priority]}"
            onclick={(event) => priorityMenu(node, event)}
          >
            <span>{PRIORITY_LABEL[node.priority]}</span><Icon name="pan-down" class="arrow-i" />
          </button>
          <button type="button" class="btn flat image-button circular" aria-label="More for {node.name}" aria-haspopup="menu" onclick={(event) => rowMenu(node, event)}>
            <Icon name="view-more" />
          </button>
        </div>
      {/each}
      {#if virtual && win.end < rows.length}<div class="files-spacer" style:height="{(rows.length - win.end) * ROW}px" aria-hidden="true"></div>{/if}
      {#if rows.length === 0}<div class="row"><span class="dimmed">No files match “{query.trim()}”.</span></div>{/if}
    </div>
  </section>
{/if}

<style>
  /* A fixed height (border included) so the virtual window can place rows by index. */
  .file-row { padding-left: calc(8px + var(--depth) * 24px); gap: 8px; height: 48px; min-height: 48px; }
  .chevron, .chevron-spacer { width: 24px; min-width: 24px; height: 24px; min-height: 24px; padding: 0; flex: none; }
  .file-name { flex: 1; min-width: 0; }
  .file-value { flex: none; }
  .prio-btn { min-width: 104px; justify-content: space-between; gap: 6px; padding: 5px 9px; font-weight: 400; }
  .prio-btn.skip { opacity: var(--dim-opacity); }
  .files-filter { width: 220px; }
</style>
