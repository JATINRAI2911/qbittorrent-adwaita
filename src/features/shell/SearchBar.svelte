<script lang="ts">
  import { slide } from '../../ui/adw/motion';
  import { tick } from 'svelte';
  import { getAppContext } from '../../app-context';
  import SearchEntry from '../../ui/adw/SearchEntry.svelte';

  /** ↓ moves into the list; returns false when there is no row to move to (focus stays here). */
  let { onleave }: { onleave: () => boolean } = $props();

  const app = getAppContext();
  let input = $state<HTMLInputElement>();

  // Focus when opened, and whenever Ctrl+F / type-to-search asks again.
  $effect(() => {
    const request = app.list.searchFocus;
    void tick().then(() => {
      input?.focus();
      if (request.select) input?.select();
    });
  });
</script>

<div class="searchbar" transition:slide>
  <div class="clamp">
    <SearchEntry
      label="Search torrents"
      placeholder="Search torrents"
      bind:input
      bind:value={() => app.list.filters.search, (search) => app.list.setFilters({ search })}
      onkeydown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (onleave()) input?.blur();
        }
      }}
    />
  </div>
</div>

<style>
  /* libadwaita: a search bar in a toolbar view is transparent with 6px padding on every side. */
  .searchbar { padding: 6px; }
  .clamp { max-width: 400px; margin: 0 auto; }
</style>
