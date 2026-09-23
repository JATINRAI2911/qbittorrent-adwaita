<script lang="ts">
  import { fade } from './ui/adw/motion';
  import { tick, untrack } from 'svelte';
  import type { AddApi } from './api/add';
  import type { AppApi } from './api/app';
  import type { ClientDataApi } from './api/clientdata';
  import type { DetailsApi } from './api/details';
  import { torrentsApi, type TorrentApi } from './api/torrents';
  import { setAppContext, targetTorrents, viewHashes, viewOrder } from './app-context';
  import { createApp } from './app-setup';
  import DropOverlay from './features/add/DropOverlay.svelte';
  import { isTorrentFile, parseSources } from './features/add/sources';
  import DetailsSheet from './features/details/DetailsSheet.svelte';
  import FilterBar from './features/filters/FilterBar.svelte';
  import Login from './features/login/Login.svelte';
  import TorrentList from './features/list/TorrentList.svelte';
  import { focusRow } from './features/list/focus-row';
  import TableView from './features/table/TableView.svelte';
  import ActionBar from './features/shell/ActionBar.svelte';
  import { isButtonTarget, isTypingTarget, keyCommand } from './features/shell/keyboard';
  import MainHeader from './features/shell/MainHeader.svelte';
  import SearchBar from './features/shell/SearchBar.svelte';
  import { assessHealth, type BannerAction } from './state/health';
  import { session as defaultSession, type Session } from './state/session.svelte';
  import Banner from './ui/adw/Banner.svelte';
  import Button from './ui/adw/Button.svelte';
  import DialogHost from './ui/adw/DialogHost.svelte';
  import PopoverHost from './ui/adw/PopoverHost.svelte';
  import Spinner from './ui/adw/Spinner.svelte';
  import StatusPage from './ui/adw/StatusPage.svelte';
  import ToastOverlay from './ui/adw/ToastOverlay.svelte';

  let {
    session = defaultSession,
    api = torrentsApi,
    clientdata,
    details: detailsClient,
    appClient,
    add,
  }: { session?: Session; api?: TorrentApi; clientdata?: ClientDataApi; details?: DetailsApi; appClient?: AppApi; add?: AddApi } = $props();

  const app = setAppContext(untrack(() => createApp(session, api, clientdata, undefined, detailsClient, appClient, add)));
  const { selection, list, table, prefs, details, commands, openers, popovers, dialogs, toasts, global } = app;

  // Selection mode hides the details sheet: stop its polling meanwhile.
  $effect(() => details.setSuspended(selection.mode));

  // The login covers everything: a menu left open would float above it.
  $effect(() => {
    if (session.connection === 'login') untrack(() => popovers.close());
  });

  let scrolled = $state(false);
  let content = $state<HTMLElement>();
  let viewportHeight = $state(0);

  // The sheet overlays the bottom of the content: pad the content by its height so rows can scroll above it.
  const sheetInset = $derived(
    selection.mode || details.sheet === 'closed' ? 0 : details.sheet === 'bar' ? 64 : Math.round(prefs.sheetHeight * viewportHeight),
  );

  // Keep the open torrent's row visible above the sheet when it opens or switches
  // torrents, not on every window resize. scroll-padding-bottom makes scrollIntoView stop short of
  // the sheet; the tick lets the new padding apply first.
  $effect(() => {
    const hash = details.hash;
    const open = details.sheet === 'open';
    if (hash && open) void tick().then(() => untrack(() => reveal(hash)));
  });

  // Close the sheet when its torrent is gone (deleted here or elsewhere).
  $effect(() => {
    const hash = details.hash;
    if (hash && !session.torrents.has(hash)) untrack(() => details.close());
  });
  const offline = $derived(session.connection === 'offline');

  // One health value for the banner and the header's status button.
  const health = $derived(
    assessHealth({
      connection: session.connection,
      retryIn: session.retryIn,
      host: location.host,
      server: session.server,
      torrents: session.torrents.values(),
      savePath: global.prefs.savePath,
      listenPort: global.prefs.listenPort,
    }),
  );

  const BANNER_ACTIONS: Record<BannerAction, { label: string; run: () => void }> = {
    connection: { label: 'Connection Settings', run: () => openers.preferences('connection') },
    retry: { label: 'Retry Now', run: () => session.retryNow() },
    downloading: { label: 'Show Downloading', run: () => list.setStatus('downloading') },
  };

  // Save path and listen port for the banner texts; refreshed on every (re)connection.
  $effect(() => {
    if (session.connection === 'online') untrack(() => void global.prefs.refresh());
  });

  $effect(() => {
    untrack(() => session.start());
    return () => {
      session.stop();
      app.details.dispose();
    };
  });

  // UI preferences live on the server: load them once we're authenticated.
  $effect(() => {
    if (session.loaded) untrack(() => void prefs.load());
  });

  // Don't lose a change still waiting on the 1 s debounce when the tab is closed or hidden.
  $effect(() => {
    const flush = () => void prefs.flushIfPending();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });

  // Actions only reach what the user can see: drop torrents that were deleted or are now filtered out.
  $effect(() => {
    const visible = new Set(viewHashes(app));
    untrack(() => selection.prune((hash) => visible.has(hash)));
  });

  // A new filter starts at the top (the table view resets its own scroller).
  $effect(() => {
    void list.filterKey;
    untrack(() => {
      if (content) content.scrollTop = 0;
    });
  });

  function reveal(hash: string) {
    if (prefs.view === 'table') table.reveal(hash);
    else document.querySelector(`[data-hash="${hash}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }

  // Set by ↓ from the search entry, cleared by the next key: Backspace right then still edits the search.
  let leftSearch = false;

  function focusFirstRow(): boolean {
    selection.focus = null;
    const hash = selection.moveFocus(1, false, viewOrder(app));
    if (hash) {
      reveal(hash);
      focusRow(hash);
    }
    leftSearch = hash !== null;
    return leftSearch;
  }

  function handleKey(event: KeyboardEvent) {
    const typing = isTypingTarget(event.target);
    const fromSearch = leftSearch && !typing;
    if (!typing) leftSearch = false;
    const command = keyCommand(event, { typing, onButton: isButtonTarget(event.target) });
    if (!command) return;
    // Inside the details sheet only Esc reaches the app: its own controls (resize handle, tabs, filters) own the other keys.
    if (command !== 'escape' && event.target instanceof Element && event.target.closest('.sheet')) return;
    if (command === 'escape') {
      if (session.connection === 'login') return;
      if (popovers.isOpen) popovers.close();
      else if (dialogs.isOpen) dialogs.closeTop();
      else if (list.filters.search) list.setFilters({ search: '' });
      else if (list.searchOpen) list.closeSearch();
      else if (selection.mode) selection.exit();
      else if (details.sheet !== 'closed') {
        const hash = details.hash;
        details.close();
        if (hash) focusRow(hash);
      }
      else selection.clear();
      return;
    }
    if (popovers.isOpen || dialogs.isOpen || session.connection !== 'online') return;
    event.preventDefault();
    const targets = targetTorrents(app);
    switch (command) {
      case 'focus-next':
      case 'focus-previous':
      case 'extend-next':
      case 'extend-previous': {
        const hash = selection.moveFocus(command.endsWith('next') ? 1 : -1, command.startsWith('extend'), viewOrder(app));
        if (hash) {
          reveal(hash);
          focusRow(hash);
          details.show(hash);
        }
        break;
      }
      case 'toggle':
        // In selection mode Space toggles the focused row; it never starts/stops the selection.
        if (selection.mode) {
          if (selection.focus) selection.toggle(selection.focus);
        } else if (targets.length) void commands.toggle(targets);
        break;
      case 'delete':
        if (fromSearch && event.key === 'Backspace') {
          list.setFilters({ search: list.filters.search.slice(0, -1) });
          list.openSearch(false);
        } else openers.confirmDelete(targets);
        break;
      case 'rename':
        if (targets.length === 1) openers.rename(targets[0]!);
        break;
      case 'select-all':
        selection.selectAll(viewHashes(app));
        break;
      case 'search':
        list.openSearch();
        break;
      case 'type':
        list.setFilters({ search: list.searchOpen ? list.filters.search + event.key : event.key });
        list.openSearch(false);
        break;
      case 'open': {
        const hash = selection.focus ?? (targets.length === 1 ? targets[0]!.hash : null);
        if (hash && !selection.mode) details.open(hash);
        break;
      }
      case 'view-list':
        prefs.setView('list');
        break;
      case 'view-table':
        prefs.setView('table');
        break;
      case 'add':
        openers.add();
        break;
      case 'preferences':
        openers.preferences();
        break;
      case 'shortcuts':
        openers.shortcuts();
        break;
    }
  }

  // The keyboard ring marks the row arrows move from; it goes once focus is somewhere else.
  function onfocusin(event: FocusEvent) {
    if (!(event.target instanceof Element && event.target.closest('[data-hash]'))) selection.keyboard = false;
  }

  let dragging = $state(false);
  let dragDepth = 0;
  const carriesTorrents = (data: DataTransfer | null) => !!data && (data.types.includes('Files') || data.types.includes('text/uri-list'));

  function onpaste(event: ClipboardEvent) {
    if (isTypingTarget(event.target) || dialogs.isOpen || session.connection !== 'online') return;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const files = [...(event.clipboardData?.files ?? [])].filter(isTorrentFile);
    if (!files.length && !parseSources(text).sources.length) return;
    event.preventDefault();
    openers.add({ text, files });
  }

  function ondragenter(event: DragEvent) {
    // Logged out or offline, nothing could be added: no hint, and the drop is swallowed below.
    if (!carriesTorrents(event.dataTransfer) || dialogs.isOpen || session.connection !== 'online') return;
    event.preventDefault();
    dragDepth++;
    dragging = true;
  }

  // A file drag is always ours: the browser's own drop would open the file and navigate away. Link
  // and text drags onto a text field stay native, so a link can be dropped into an entry.
  const leaveToField = (event: DragEvent) => isTypingTarget(event.target) && !event.dataTransfer?.types.includes('Files');

  function ondragover(event: DragEvent) {
    if (carriesTorrents(event.dataTransfer) && !leaveToField(event)) event.preventDefault();
  }

  function ondragleave() {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragging = false;
  }

  function ondrop(event: DragEvent) {
    // No dragleave follows a drop: reset the hint whatever happens next.
    const wasDragging = dragging;
    dragging = false;
    dragDepth = 0;
    if (!carriesTorrents(event.dataTransfer) || leaveToField(event)) return;
    event.preventDefault();
    if (!wasDragging) return;
    const files = [...(event.dataTransfer?.files ?? [])].filter(isTorrentFile);
    const text = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain') || '';
    if (files.length || parseSources(text).sources.length) openers.add({ text, files });
    else toasts.show({ title: 'Only .torrent files and magnet links can be added' });
  }
</script>

<svelte:window onkeydown={handleKey} {onfocusin} bind:innerHeight={viewportHeight} {onpaste} {ondragenter} {ondragover} {ondragleave} {ondrop} />

{#if session.loaded}
  <div class="window" inert={session.connection === 'login' || dialogs.isOpen}>
    <div class="top-bar" class:raised={scrolled}>
      <MainHeader torrents={session.torrents} server={session.server} {offline} {health} />
      {#if health.banner}
        {@const action = BANNER_ACTIONS[health.banner.action]}
        <Banner tone={health.banner.tone} title={health.banner.text} detail={health.banner.detail} actionLabel={action?.label} onaction={action?.run} />
      {/if}
      {#if list.searchOpen}<SearchBar onleave={focusFirstRow} />{/if}
      {#if !selection.mode && (session.torrents.size > 10 || list.filtering)}<FilterBar />{/if}
    </div>
    <main
      class="content"
      bind:this={content}
      class:offline
      class:table={prefs.view === 'table'}
      style:padding-bottom="{sheetInset}px"
      style:scroll-padding-bottom="{sheetInset}px"
      onscroll={(event) => (scrolled = event.currentTarget.scrollTop > 0)}
    >
      {#if prefs.view === 'table'}<TableView />{:else}<TorrentList />{/if}
    </main>
    {#if selection.mode}<ActionBar {offline} />{/if}
    {#if !selection.mode}<DetailsSheet />{/if}
  </div>
{:else if offline}
  <StatusPage icon="offline" title="Can’t Reach qBittorrent" description="Nothing answered at {location.host}. Retrying in {session.retryIn} s…">
    <Button variant="suggested" pill label="Retry Now" onclick={() => session.retryNow()} />
  </StatusPage>
{:else if session.syncError && session.connection === 'online'}
  <StatusPage icon="warning" title="Can’t Read qBittorrent’s Data" description="Its answer didn’t make sense ({session.syncError}). Trying again…" />
{:else if session.connection === 'starting'}
  <div class="loading"><Spinner size={32} label="Connecting to qBittorrent" /></div>
{/if}

{#if session.connection === 'login'}
  <div class="login-layer" class:over-app={session.loaded} transition:fade>
    <Login onlogin={(username, password) => session.login(username, password)} />
  </div>
{/if}

<PopoverHost store={popovers} />
<DialogHost store={dialogs} suspended={session.connection === 'login'} />
<ToastOverlay store={toasts} bottom={selection.mode ? 52 : sheetInset} behindDialog={dialogs.isOpen} />
{#if dragging}<DropOverlay />{/if}

<style>
  .window { position: fixed; inset: 0; display: flex; flex-direction: column; }
  .top-bar { flex: none; position: relative; z-index: 2; transition: box-shadow 200ms var(--ease-out-quad); }
  .top-bar.raised { box-shadow: 0 1px color-mix(in srgb, var(--shade-color) 75%, transparent); }
  /* Under the header the filter bar sits in the header's bottom padding; under a banner it needs its own. */
  .top-bar :global(.banner + .filterbar) { padding-top: 6px; }
  .content { flex: 1; min-height: 0; overflow: auto; }
  .content.table { overflow: hidden; }
  .content.offline { filter: saturate(0.3); opacity: 0.6; pointer-events: none; transition: opacity 300ms var(--ease-out-quad); }
  .loading { position: fixed; inset: 0; display: grid; place-items: center; color: var(--accent-color); }
  /* Above dialogs (400), which wait underneath, inert, until the session is back. */
  .login-layer { position: fixed; inset: 0; z-index: 450; overflow: auto; background: var(--window-bg-color); }
  .login-layer.over-app { background: color-mix(in srgb, var(--window-bg-color) 85%, transparent); backdrop-filter: blur(6px); }
</style>
