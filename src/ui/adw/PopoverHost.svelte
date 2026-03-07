<script lang="ts">
  import { untrack } from 'svelte';
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
  {#key store.panel.id}
    <!-- A snapshot for this panel's lifetime: a panel may call its props after close() cleared the store. -->
    {@const panel = untrack(() => store.panel)!}
    <Popover anchor={panel.anchor} onclose={() => store.close()} class="panel-popover">
      <panel.component {...panel.props} close={() => store.close()} />
    </Popover>
  {/key}
{/if}
