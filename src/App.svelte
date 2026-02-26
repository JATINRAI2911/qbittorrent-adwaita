<script lang="ts">
  import { untrack } from 'svelte';
  import { torrentsApi, type TorrentApi } from './api/torrents';
  import { setAppContext } from './app-context';
  import { createApp } from './app-setup';
  import Login from './features/login/Login.svelte';
  import TorrentList from './features/list/TorrentList.svelte';
  import MainHeader from './features/shell/MainHeader.svelte';
  import { session as defaultSession, type Session } from './state/session.svelte';
  import Banner from './ui/adw/Banner.svelte';
  import Button from './ui/adw/Button.svelte';
  import DialogHost from './ui/adw/DialogHost.svelte';
  import PopoverHost from './ui/adw/PopoverHost.svelte';
  import Spinner from './ui/adw/Spinner.svelte';
  import StatusPage from './ui/adw/StatusPage.svelte';
  import ToastOverlay from './ui/adw/ToastOverlay.svelte';

  let { session = defaultSession, api = torrentsApi }: { session?: Session; api?: TorrentApi } = $props();

  const app = setAppContext(untrack(() => createApp(session, api)));
  const { selection, popovers, dialogs, toasts } = app;

  let scrolled = $state(false);
  const offline = $derived(session.connection === 'offline');

  $effect(() => {
    untrack(() => session.start());
    return () => session.stop();
  });
</script>

{#if session.loaded}
  <div class="window" inert={session.connection === 'login' || dialogs.isOpen}>
    <div class="top-bar" class:raised={scrolled}>
      <MainHeader torrents={session.torrents} server={session.server} {offline} />
      {#if offline}
        <Banner tone="error" title="Can’t reach qBittorrent. Retrying in {session.retryIn} s…" actionLabel="Retry Now" onaction={() => session.retryNow()} />
      {/if}
    </div>
    <main class="content" class:offline onscroll={(event) => (scrolled = event.currentTarget.scrollTop > 0)}>
      <TorrentList />
    </main>
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
  .content.offline { filter: saturate(0.3); opacity: 0.6; pointer-events: none; transition: opacity 300ms var(--ease-out-quad); }
  .loading { position: fixed; inset: 0; display: grid; place-items: center; color: var(--accent-color); }
  .login-layer { position: fixed; inset: 0; z-index: 10; overflow: auto; background: var(--window-bg-color); }
  .login-layer.over-app { background: color-mix(in srgb, var(--window-bg-color) 85%, transparent); backdrop-filter: blur(6px); }
</style>
