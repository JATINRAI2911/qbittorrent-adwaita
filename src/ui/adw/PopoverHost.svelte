<script lang="ts">
  import Menu from './Menu.svelte';
  import Popover from './Popover.svelte';
  import type { PopoverStore } from './popovers.svelte';

  let { store }: { store: PopoverStore } = $props();
</script>

{#if store.current}
  {#key store.current.id}
    <Popover anchor={store.current.anchor} onclose={() => store.close()} class="menu-popover">
      <Menu model={store.current.model} onclose={() => store.close()} />
    </Popover>
  {/key}
{/if}
