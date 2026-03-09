<script lang="ts">
  import { untrack } from 'svelte';
  import type { ClientDataApi } from './api/clientdata';
  import { torrentsApi, type TorrentApi } from './api/torrents';
  import { setAppContext, targetTorrents, viewHashes, viewOrder } from './app-context';
  import { createApp } from './app-setup';
  import FilterBar from './features/filters/FilterBar.svelte';
  import Login from './features/login/Login.svelte';
  import TorrentList from './features/list/TorrentList.svelte';
  import TableView from './features/table/TableView.svelte';
  import ActionBar from './features/shell/ActionBar.svelte';
  import { isButtonTarget, isTypingTarget, keyCommand } from './features/shell/keyboard';
  import MainHeader from './features/shell/MainHeader.svelte';
  import SearchBar from './features/shell/SearchBar.svelte';
  import { session as defaultSession, type Session } from './state/session.svelte';
  import Banner from './ui/adw/Banner.svelte';
  import Button from './ui/adw/Button.svelte';
  import DialogHost from './ui/adw/DialogHost.svelte';
  import PopoverHost from './ui/adw/PopoverHost.svelte';
  import Spinner from './ui/adw/Spinner.svelte';
  import StatusPage from './ui/adw/StatusPage.svelte';
  import ToastOverlay from './ui/adw/ToastOverlay.svelte';

  let { session = defaultSession, api = torrentsApi, clientdata }: { session?: Session; api?: TorrentApi; clientdata?: ClientDataApi } = $props();

  const app = setAppContext(untrack(() => createApp(session, api, clientdata)));
  const { selection, list, table, prefs, commands, openers, popovers, dialogs, toasts } = app;

  let scrolled = $state(false);
  let content = $state<HTMLElement>();
  const offline = $derived(session.connection === 'offline');

  $effect(() => {
    untrack(() => session.start());
    return () => session.stop();
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

  function focusFirstRow() {
    selection.focus = null;
    const hash = selection.moveFocus(1, false, viewOrder(app));
    if (hash) reveal(hash);
  }

  function handleKey(event: KeyboardEvent) {
    const command = keyCommand(event, { typing: isTypingTarget(event.target), onButton: isButtonTarget(event.target) });
    if (!command) return;
    if (command === 'escape') {
      if (popovers.isOpen) popovers.close();
      else if (dialogs.isOpen) dialogs.closeTop();
      else if (list.filters.search) list.setFilters({ search: '' });
      else if (list.searchOpen) list.closeSearch();
      else if (selection.mode) selection.exit();
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
        if (hash) reveal(hash);
        break;
      }
      case 'toggle':
        // In selection mode Space toggles the focused row; it never starts/stops the selection.
        if (selection.mode) {
          if (selection.focus) selection.toggle(selection.focus);
        } else if (targets.length) void commands.toggle(targets);
        break;
      case 'delete':
        openers.confirmDelete(targets);
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
      case 'view-list':
        prefs.setView('list');
        break;
      case 'view-table':
        prefs.setView('table');
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if session.loaded}
  <div class="window" inert={session.connection === 'login' || dialogs.isOpen}>
    <div class="top-bar" class:raised={scrolled}>
      <MainHeader torrents={session.torrents} server={session.server} {offline} />
      {#if offline}
        <Banner tone="error" title="Can’t reach qBittorrent. Retrying in {session.retryIn} s…" actionLabel="Retry Now" onaction={() => session.retryNow()} />
      {/if}
      {#if list.searchOpen}<SearchBar onleave={focusFirstRow} />{/if}
      {#if !selection.mode && (session.torrents.size > 10 || list.filtering)}<FilterBar />{/if}
    </div>
    <main class="content" bind:this={content} class:offline class:table={prefs.view === 'table'} onscroll={(event) => (scrolled = event.currentTarget.scrollTop > 0)}>
      {#if prefs.view === 'table'}<TableView />{:else}<TorrentList />{/if}
    </main>
    {#if selection.mode}<ActionBar />{/if}
  </div>
{:else if offline}
  <StatusPage icon="offline" title="Can’t Reach qBittorrent" description="Retrying in {session.retryIn} s…">
    <Button variant="suggested" pill label="Retry Now" onclick={() => session.retryNow()} />
  </StatusPage>
{:else if session.connection === 'starting'}
  <div class="loading"><Spinner size={32} label="Connecting to qBittorrent" /></div>
{/if}

{#if session.connection === 'login'}
  <div class="login-layer" class:over-app={session.loaded}>
    <Login onlogin={(username, password) => session.login(username, password)} />
  </div>
{/if}

<PopoverHost store={popovers} />
<DialogHost store={dialogs} />
<ToastOverlay store={toasts} bottom={selection.mode ? 52 : 0} />

<style>
  .window { position: fixed; inset: 0; display: flex; flex-direction: column; }
  .top-bar { flex: none; position: relative; z-index: 2; transition: box-shadow 200ms var(--ease-out-quad); }
  .top-bar.raised { box-shadow: 0 1px color-mix(in srgb, var(--shade-color) 75%, transparent); }
  .content { flex: 1; min-height: 0; overflow: auto; }
  .content.table { overflow: hidden; }
  .content.offline { filter: saturate(0.3); opacity: 0.6; pointer-events: none; transition: opacity 300ms var(--ease-out-quad); }
  .loading { position: fixed; inset: 0; display: grid; place-items: center; color: var(--accent-color); }
  .login-layer { position: fixed; inset: 0; z-index: 10; overflow: auto; background: var(--window-bg-color); }
  .login-layer.over-app { background: color-mix(in srgb, var(--window-bg-color) 85%, transparent); backdrop-filter: blur(6px); }
</style>
