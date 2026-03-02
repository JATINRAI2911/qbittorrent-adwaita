<script lang="ts">
  import { untrack } from 'svelte';
  import type { ShareLimitAction } from '../../api/torrents';
  import type { Torrent } from '../../api/types';
  import type { LimitChanges } from '../../commands/torrent-commands';
  import { formatCount } from '../../lib/format';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import SpinRow from '../../ui/adw/SpinRow.svelte';
  import { changedLimits, formFromTorrent, type LimitMode } from './limits';

  interface Props {
    torrents: Torrent[];
    onconfirm: (changes: LimitChanges) => void;
    close: () => void;
  }
  let { torrents, onconfirm, close }: Props = $props();

  // The form starts from the first torrent's current limits; later syncs must not overwrite edits.
  // Only fields the user changes are sent, so a multi-torrent selection keeps everything else.
  const initial = untrack(() => formFromTorrent(torrents[0]!));
  const form = $state({ ...initial });
  const changes = $derived(changedLimits(initial, form));
  const unchanged = $derived(Object.keys(changes).length === 0);
  const MODES: { value: LimitMode; label: string }[] = [
    { value: 'global', label: 'Use global limit' },
    { value: 'unlimited', label: 'Unlimited' },
    { value: 'custom', label: 'Custom' },
  ];
  const ACTIONS: { value: ShareLimitAction; label: string }[] = [
    { value: 'Default', label: 'Use global action' },
    { value: 'Stop', label: 'Stop torrent' },
    { value: 'Remove', label: 'Remove torrent' },
    { value: 'RemoveWithContent', label: 'Remove torrent and files' },
    { value: 'EnableSuperSeeding', label: 'Enable super seeding' },
  ];
</script>

<Dialog
  title="Speed and Share Limits"
  confirmLabel="Apply"
  width={480}
  confirmDisabled={unchanged}
  {close}
  onconfirm={() => {
    onconfirm(changes);
    close();
  }}
>
  {#if torrents.length > 1}<p class="dialog-note limits-note">Only the values you change are applied to all {formatCount(torrents.length)} torrents.</p>{/if}
  <section class="limits-group" aria-label="Speed">
    <h3 class="heading">Speed</h3>
    <BoxedList>
      <SpinRow title="Download limit" subtitle="0 means unlimited" unit="KiB/s" bind:value={form.downloadKiB} />
      <SpinRow title="Upload limit" subtitle="0 means unlimited" unit="KiB/s" bind:value={form.uploadKiB} />
    </BoxedList>
  </section>
  <section class="limits-group" aria-label="Sharing">
    <h3 class="heading">Sharing</h3>
    <BoxedList>
      <ComboRow title="Ratio limit" options={MODES} bind:value={form.ratioMode} />
      {#if form.ratioMode === 'custom'}<SpinRow title="Ratio" step={0.1} digits={2} bind:value={form.ratio} />{/if}
      <ComboRow title="Seeding time limit" options={MODES} bind:value={form.seedingMode} />
      {#if form.seedingMode === 'custom'}<SpinRow title="Seeding time" unit="minutes" bind:value={form.seedingMinutes} />{/if}
      <ComboRow title="Inactive seeding limit" options={MODES} bind:value={form.inactiveMode} />
      {#if form.inactiveMode === 'custom'}<SpinRow title="Inactive seeding time" unit="minutes" bind:value={form.inactiveMinutes} />{/if}
      <ComboRow title="When reached" options={ACTIONS} bind:value={form.action} />
    </BoxedList>
  </section>
</Dialog>

<style>
  .limits-group { display: flex; flex-direction: column; gap: 12px; }
  .limits-group h3 { margin: 0 4px; }
  .limits-note { margin: 0 4px; }
</style>
