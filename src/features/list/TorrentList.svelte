<script lang="ts">
  import type { Torrent } from '../../api/types';
  import { expansionAfter, layoutGroups, type GroupKey, type StatusFilter } from '../../state/groups';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import GroupSection from './GroupSection.svelte';

  let { torrents, status = 'all' }: { torrents: ReadonlyMap<string, Torrent>; status?: StatusFilter } = $props();

  let collapsed = $state<Partial<Record<GroupKey, boolean>>>({});
  let expanded = $state<Partial<Record<GroupKey, number>>>({});

  // Reads only grouping/sort fields of each torrent, so live speed ticks never re-run this.
  const layout = $derived(layoutGroups(torrents.values(), { status, libraryTotal: torrents.size, collapsed, expanded }));
</script>

{#if torrents.size === 0}
  <StatusPage icon="magnet" title="No Torrents" description="Torrents you add will appear here." />
{:else}
  <div class="page">
    {#each layout.groups as group (group.key)}
      <GroupSection
        view={group}
        single={layout.single}
        oncollapse={() => (collapsed[group.key] = !group.collapsed)}
        onexpand={() => (expanded[group.key] = expansionAfter(group, layout.single))}
      />
    {/each}
  </div>
{/if}

<style>
  .page { max-width: 860px; margin: 0 auto; padding: 12px 12px 24px; display: flex; flex-direction: column; gap: 24px; }
</style>
