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
{:else if store.panel}
  {@const Panel = store.panel.component}
  {#key store.panel.id}
    <Popover anchor={store.panel.anchor} onclose={() => store.close()} class="panel-popover">
      <Panel {...store.panel.props} close={() => store.close()} />
    </Popover>
  {/key}
{/if}
