<script lang="ts">
  import pkg from '../../../package.json';
  import type { BuildInfo } from '../../api/app';
  import { getAppContext } from '../../app-context';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import Icon from '../../ui/adw/Icon.svelte';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();

  let version = $state('');
  let webapi = $state('');
  let build = $state<BuildInfo | null>(null);
  const PLATFORMS: Record<string, string> = { macos: 'macOS', linux: 'Linux', windows: 'Windows', freebsd: 'FreeBSD' };

  $effect(() => {
    const api = app.adding.appApi;
    void api.version().then((v) => (version = v.replace(/^v/, ''))).catch(() => {});
    void api.webapiVersion().then((v) => (webapi = v)).catch(() => {});
    void api.buildInfo().then((b) => (build = b)).catch(() => {});
  });
</script>

<!-- AdwAboutDialog-style. -->
<Dialog title="About qBittorrent" width={400} {close}>
  <div class="about">
    <div class="app-icon"><Icon name="magnet" /></div>
    <h2 class="title-1">qBittorrent</h2>
    <p class="dimmed">The qBittorrent Project</p>
    {#if version}<span class="version-pill">{version}</span>{/if}
  </div>
  <div class="boxed-list">
    <div class="row"><span class="title">Web API</span><span class="dimmed numeric">{webapi || '–'}</span></div>
    <div class="row"><span class="title">Web UI</span><span class="dimmed">Adwaita {pkg.version}</span></div>
  </div>
  {#if build}
    <section class="pref-group" aria-label="Build">
      <h4 class="heading">Build</h4>
      <div class="boxed-list">
        {#each [['Qt', build.qt], ['libtorrent', build.libtorrent], ['Boost', build.boost], ['OpenSSL', build.openssl], ['zlib', build.zlib]] as [name, value] (name)}
          <div class="row"><span class="title">{name}</span><span class="dimmed numeric">{value}</span></div>
        {/each}
        <div class="row"><span class="title">System</span><span class="dimmed">{build.bitness}-bit {PLATFORMS[build.platform] ?? build.platform}</span></div>
      </div>
    </section>
  {/if}
  <div class="boxed-list">
    <a class="row activatable link-row" href="https://www.qbittorrent.org" target="_blank" rel="noopener noreferrer"><span class="title">Website</span><Icon name="link" class="dimmed" /></a>
    <a class="row activatable link-row" href="https://github.com/qbittorrent/qBittorrent" target="_blank" rel="noopener noreferrer"><span class="title">Source Code</span><Icon name="link" class="dimmed" /></a>
  </div>
</Dialog>

<style>
  .about { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
  .app-icon { display: grid; place-items: center; width: 96px; height: 96px; border-radius: 24px; background: var(--accent-bg-color); color: var(--accent-fg-color); margin-bottom: 6px; }
  .app-icon :global(svg.i) { width: 56px; height: 56px; }
  .about h2 { margin: 0; }
  .about p { margin: 0; }
  .version-pill { margin-top: 6px; padding: 2px 12px; border-radius: 99px; font-weight: 700; color: var(--accent-color); background: color-mix(in srgb, var(--accent-bg-color) 15%, transparent); }
  .pref-group { display: flex; flex-direction: column; gap: 8px; }
  .pref-group h4 { margin: 0 4px; }
  .row .title { flex: 1; }
  .link-row { color: inherit; text-decoration: none; }
</style>
