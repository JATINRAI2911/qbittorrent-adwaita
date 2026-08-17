<script lang="ts">
  import { DURATION, slide } from '../../ui/adw/motion';
  import { formatCount } from '../../lib/format';
  import { PAGE_SIZE, type GroupView } from '../../state/groups';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import ButtonRow from '../../ui/adw/ButtonRow.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import TorrentRow from './TorrentRow.svelte';

  interface Props {
    view: GroupView;
    single: boolean;
    oncollapse: () => void;
    onexpand: () => void;
  }
  let { view, single, oncollapse, onexpand }: Props = $props();

  const headingId = $props.id();
</script>

<section class="group" aria-labelledby={headingId}>
  <div class="group-header">
    <h2 class="heading" id={headingId} class:error={view.key === 'attention'}>
      {#if view.key === 'attention'}<Icon name="warning" />{/if}{view.title}
    </h2>
    <span class="dimmed numeric">{formatCount(view.total)}</span>
    <span class="spacer"></span>
    {#if !single}
      <Button variant="flat" icon={view.collapsed ? 'pan-end' : 'pan-down'} title="{view.collapsed ? 'Expand' : 'Collapse'} {view.title}" expanded={!view.collapsed} onclick={oncollapse} />
    {/if}
  </div>
  <!-- Expanding a group reveals its rows like a GtkRevealer. -->
  {#key view.collapsed}
  <div class="group-body" in:slide={{ duration: DURATION.slow }}>
  <BoxedList role="list">
    {#if view.collapsed}
      <ButtonRow listitem title="Show {formatCount(view.total)} {view.total === 1 ? 'Torrent' : 'Torrents'}" onclick={oncollapse} />
    {:else}
      {#each view.items as torrent (torrent.hash)}
        <TorrentRow {torrent} />
      {/each}
      {#if view.hidden > 0}
        {#if single}
          <ButtonRow listitem title="Show {formatCount(Math.min(PAGE_SIZE, view.hidden))} More" subtitle="{formatCount(view.hidden)} remaining" onclick={onexpand} />
        {:else}
          <ButtonRow listitem title="Show All {formatCount(view.total)}" onclick={onexpand} />
        {/if}
      {/if}
    {/if}
  </BoxedList>
  </div>
  {/key}
</section>

<style>
  .group-header { display: flex; align-items: center; gap: 8px; min-height: 34px; margin-bottom: 6px; padding: 0 2px 0 4px; }
  .group-header h2 { display: flex; align-items: center; gap: 6px; }
  .spacer { flex: 1; }
</style>
