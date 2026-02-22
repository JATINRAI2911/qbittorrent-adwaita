<script lang="ts">
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import GroupSection from './GroupSection.svelte';
  import type { ListModel } from './list-model.svelte';

  let { model }: { model: ListModel } = $props();
</script>

{#if model.torrents.size === 0}
  <StatusPage icon="magnet" title="No Torrents" description="Torrents you add will appear here." />
{:else}
  <div class="page">
    {#each model.layout.groups as group (group.key)}
      <GroupSection view={group} single={model.layout.single} oncollapse={() => model.toggleCollapsed(group)} onexpand={() => model.expand(group)} />
    {/each}
  </div>
{/if}

<style>
  .page { max-width: 860px; margin: 0 auto; padding: 12px 12px 24px; display: flex; flex-direction: column; gap: 24px; }
</style>
