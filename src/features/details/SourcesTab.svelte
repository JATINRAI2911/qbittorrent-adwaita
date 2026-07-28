<script lang="ts">
  import type { WebSeed } from '../../api/details';
  import { getAppContext } from '../../app-context';
  import { formatCount } from '../../lib/format';
  import Button from '../../ui/adw/Button.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import TextDialog from './TextDialog.svelte';
  import TextListDialog from './TextListDialog.svelte';

  let { hash, webseeds }: { hash: string; webseeds: WebSeed[] | null } = $props();
  const app = getAppContext();
  const validUrl = (value: string) => (/^(https?|ftp):\/\/\S+$/i.test(value) ? null : 'Web seeds must be http, https or ftp URLs.');

  function add() {
    app.dialogs.open(TextListDialog, {
      title: 'Add Web Seeds',
      label: 'URLs',
      placeholder: 'https://mirror.example.org/files/',
      description: 'One URL per line.',
      confirmLabel: 'Add',
      onconfirm: (text: string) => void app.detailCommands.addWebSeeds(hash, text),
    });
  }

  function menu(seed: WebSeed, event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          [
            { label: 'Copy URL', action: () => void app.detailCommands.copyUrl(seed.url) },
            {
              label: 'Edit URL…',
              action: () =>
                app.dialogs.open(TextDialog, {
                  title: 'Edit Web Seed',
                  label: 'URL',
                  value: seed.url,
                  confirmLabel: 'Save',
                  validate: validUrl,
                  onconfirm: (newUrl: string) => void app.detailCommands.editWebSeed(hash, seed.url, newUrl),
                }),
            },
          ],
          [{ label: 'Remove', destructive: true, action: () => void app.detailCommands.removeWebSeed(hash, seed.url) }],
        ],
      },
      event.currentTarget as HTMLElement,
      'end',
    );
  }
</script>

{#if webseeds === null}
  <div class="tab-loading"><Spinner size={24} label="Loading web seeds" /></div>
{:else if webseeds.length === 0}
  <StatusPage compact icon="link" title="No HTTP Sources" description="Web seeds let peers download from a regular web server.">
    <Button pill label="Add Web Seeds…" onclick={add} />
  </StatusPage>
{:else}
  <section class="pref-group">
    <div class="pg-header">
      <div><h3 class="heading">{formatCount(webseeds.length)} {webseeds.length === 1 ? 'Web Seed' : 'Web Seeds'}</h3></div>
      <Button variant="flat" icon="list-add" title="Add Web Seeds" onclick={add} />
    </div>
    <div class="boxed-list">
      {#each webseeds as seed (seed.url)}
        <div class="row">
          <Icon name="link" class="dimmed" />
          <span class="title monospace ellipsis seed-url">{seed.url}</span>
          <button type="button" class="btn flat image-button circular" aria-label="More for {seed.url}" aria-haspopup="menu" onclick={(event) => menu(seed, event)}><Icon name="view-more" /></button>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .seed-url { flex: 1; min-width: 0; }
</style>
