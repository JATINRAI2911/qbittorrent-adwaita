<script lang="ts">
  import { getAppContext } from '../../app-context';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import SpinRow from '../../ui/adw/SpinRow.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import TimeRow from '../../ui/adw/TimeRow.svelte';
  import { formFromPreferences, preferenceChanges, SCHEDULE_DAYS, type SpeedLimitsForm } from './speed-limits';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();

  let initial = $state.raw<SpeedLimitsForm | null>(null);
  let form = $state<SpeedLimitsForm | null>(null);
  const changes = $derived(initial && form ? preferenceChanges(initial, form) : {});
  const days = SCHEDULE_DAYS.map((d) => ({ value: String(d.value), label: d.label }));

  let failed = $state(false);

  // Always start from a fresh read: another client may have changed the limits since the last one.
  // A failed read shows an error, never the cached or empty values dressed up as current.
  async function load() {
    failed = false;
    if (!(await app.global.prefs.refresh())) {
      failed = true;
      return;
    }
    const seeded = formFromPreferences(app.global.prefs.values ?? {});
    initial = seeded;
    form = { ...seeded };
  }

  $effect(() => {
    void load();
  });

  async function save() {
    const sent = changes;
    close();
    if (await app.global.commands.savePreferences(sent, 'Saved speed limits')) void app.global.prefs.refresh();
  }
</script>

<Dialog title="Speed Limits" confirmLabel="Save" confirmDisabled={Object.keys(changes).length === 0} width={480} {close} onconfirm={save}>
  {#if form}
    <section class="pref-group" aria-label="Global limits">
      <h4 class="heading">Global Limits</h4>
      <BoxedList>
        <SpinRow title="Download" subtitle="0 means unlimited" unit="KiB/s" bind:value={form.dl} />
        <SpinRow title="Upload" subtitle="0 means unlimited" unit="KiB/s" bind:value={form.up} />
      </BoxedList>
    </section>
    <section class="pref-group" aria-label="Alternative limits">
      <h4 class="heading">Alternative Limits</h4>
      <BoxedList>
        <SpinRow title="Alternative download" subtitle="0 means unlimited" unit="KiB/s" bind:value={form.altDl} />
        <SpinRow title="Alternative upload" subtitle="0 means unlimited" unit="KiB/s" bind:value={form.altUp} />
      </BoxedList>
    </section>
    <section class="pref-group" aria-label="Schedule">
      <h4 class="heading">Schedule</h4>
      <BoxedList>
        <SwitchRow title="Use alternative limits on a schedule" bind:checked={form.scheduled} />
        {#if form.scheduled}
          <TimeRow title="From" bind:value={form.from} />
          <TimeRow title="To" bind:value={form.to} />
          <ComboRow title="Days" options={days} bind:value={() => String(form!.days), (v) => (form!.days = Number(v))} />
        {/if}
      </BoxedList>
    </section>
  {:else if failed}
    <StatusPage compact icon="warning" title="Couldn’t Load Limits" description="Couldn’t read the current speed limits.">
      <Button label="Try Again" onclick={() => void load()} />
    </StatusPage>
  {:else}
    <div class="loading"><Spinner size={24} label="Loading speed limits" /></div>
  {/if}
</Dialog>

<style>
  .pref-group { display: flex; flex-direction: column; gap: 8px; }
  .pref-group h4 { margin: 0 4px; }
  .loading { display: grid; place-items: center; min-height: 160px; }
</style>
