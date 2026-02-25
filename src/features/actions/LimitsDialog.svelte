<script lang="ts">
  import { untrack } from 'svelte';
  import type { ShareLimitAction, ShareLimits } from '../../api/torrents';
  import type { Torrent } from '../../api/types';
  import type { SpeedLimits } from '../../commands/torrent-commands';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import SpinRow from '../../ui/adw/SpinRow.svelte';
  import { formFromTorrent, limitsFromForm, type LimitMode } from './limits';

  interface Props {
    torrents: Torrent[];
    onconfirm: (limits: { speed: SpeedLimits; share: ShareLimits }) => void;
    close: () => void;
  }
  let { torrents, onconfirm, close }: Props = $props();

  // The form starts from the first torrent's current limits; later syncs must not overwrite edits.
  const form = $state(untrack(() => formFromTorrent(torrents[0]!)));
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
  {close}
  onconfirm={() => {
    onconfirm(limitsFromForm(form));
    close();
  }}
>
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
</style>
