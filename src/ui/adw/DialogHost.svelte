<script lang="ts">
  import type { DialogStore } from './dialogs.svelte';

  let { store }: { store: DialogStore } = $props();
</script>

{#each store.stack as entry, i (entry.id)}
  {@const Current = entry.component}
  <!-- Backdrop clicks close the dialog; keyboard users close it with Escape (handled by the app). -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="dialog-host"
    inert={i < store.stack.length - 1}
    onpointerdown={(event) => {
      if (event.target === event.currentTarget) store.close(entry.id);
    }}
  >
    <Current {...entry.props} close={() => store.close(entry.id)} />
  </div>
{/each}
