<script lang="ts">
  import type { Tracker } from '../../api/details';
  import type { Torrent } from '../../api/types';
  import { getAppContext } from '../../app-context';
  import { hostOf } from '../../state/filters';
  import AlertDialog from '../../ui/adw/AlertDialog.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import TextDialog from './TextDialog.svelte';
  import TextListDialog from './TextListDialog.svelte';
  import { maskSecrets, maskTrackerUrl, splitTrackers, trackerSummary, trackerTone } from './trackers';

  let { torrent, trackers }: { torrent: Torrent; trackers: Tracker[] | null } = $props();

  const app = getAppContext();
  const split = $derived(trackers ? splitTrackers(trackers) : null);
  const now = $derived(trackers ? Date.now() / 1000 : 0);
  const validUrl = (value: string) => (/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(value) ? null : 'Enter a full tracker URL.');

  function menu(tracker: Tracker, event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          [
            { label: 'Copy URL', action: () => void app.detailCommands.copyTracker(tracker.url) },
            {
              label: 'Edit URL…',
              action: () =>
                app.dialogs.open(TextDialog, {
                  title: 'Edit Tracker',
                  label: 'URL',
                  value: tracker.url,
                  confirmLabel: 'Save',
                  validate: validUrl,
                  onconfirm: (newUrl: string) => void app.detailCommands.editTracker(torrent.hash, tracker.url, newUrl),
                }),
            },
          ],
          [
            {
              label: 'Remove…',
              destructive: true,
              action: () =>
                app.dialogs.open(AlertDialog, {
                  heading: 'Remove Tracker?',
                  body: `${hostOf(tracker.url)} will no longer be announced to for “${torrent.name}”.`,
                  responses: [
                    { id: 'cancel', label: 'Cancel' },
                    { id: 'remove', label: 'Remove', variant: 'destructive' },
                  ],
                  onresponse: (id: string) => id === 'remove' && void app.detailCommands.removeTracker(torrent.hash, tracker.url),
                }),
            },
          ],
        ],
      },
      event.currentTarget as HTMLElement,
      'end',
    );
  }

  function addTrackers() {
    app.dialogs.open(TextListDialog, {
      title: 'Add Trackers',
      label: 'Tracker URLs',
      placeholder: 'udp://tracker.example.org:1337/announce',
      description: 'One URL per line. Leave an empty line between tiers.',
      confirmLabel: 'Add',
      onconfirm: (text: string) => void app.detailCommands.addTrackers(torrent.hash, text),
    });
  }
</script>

{#if split === null}
  <div class="tab-loading"><Spinner size={24} label="Loading trackers" /></div>
{:else}
  <div class="ov-cols two">
    <section class="pref-group">
      <div class="pg-header">
        <div><h3 class="heading">Trackers</h3></div>
        <Button variant="flat" label="Reannounce" onclick={() => void app.commands.reannounce([torrent])} />
        <Button variant="flat" icon="list-add" title="Add Trackers" onclick={addTrackers} />
      </div>
      <div class="boxed-list">
        {#each split.trackers as tracker (tracker.url)}
          {@const tone = trackerTone(tracker)}
          <div class="row tracker-row">
            <span class="status-dot {tone}" aria-hidden="true"></span>
            <div class="title-box">
              <span class="title monospace ellipsis">{maskTrackerUrl(tracker.url)}</span>
              <span class="subtitle" class:error={tone === 'bad'}>{trackerSummary(tracker, now)}</span>
            </div>
            <button type="button" class="btn flat image-button circular" aria-label="More for {hostOf(tracker.url)}" aria-haspopup="menu" onclick={(event) => menu(tracker, event)}>
              <Icon name="view-more" />
            </button>
          </div>
        {:else}
          <div class="row"><span class="dimmed">No trackers. Peers come from DHT, PeX and LSD only.</span></div>
        {/each}
      </div>
    </section>
    <section class="pref-group">
      <div class="pg-header"><div><h3 class="heading">Other Peer Sources</h3></div></div>
      <div class="boxed-list">
        {#each split.sources as source (source.url)}
          {@const tone = trackerTone(source)}
          <div class="row">
            <span class="status-dot {tone}" aria-hidden="true"></span>
            <div class="title-box">
              <span class="title">{source.label}</span>
              <span class="subtitle">{maskSecrets(source.msg) || (tone === 'ok' ? `${source.num_peers >= 0 ? source.num_peers : 0} peers` : trackerSummary(source, now))}</span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>
{/if}

<style>
  .tracker-row { gap: 12px; }
  .tracker-row .title-box { min-width: 0; }
  .subtitle.error { color: var(--error-color); opacity: 1; }
</style>
