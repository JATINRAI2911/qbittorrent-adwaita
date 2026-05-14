<script lang="ts">
  import Button from './Button.svelte';
  import { DURATION, fade, rise } from './motion';
  import type { ToastStore } from './toast.svelte';

  let { store, bottom = 0 }: { store: ToastStore; bottom?: number } = $props();
</script>

<div class="toast-overlay" style:bottom="{bottom}px">
  {#if store.current}
    {#key store.current.id}
      <div class="toast" role="status" in:rise|global={{ duration: DURATION.slow, y: 16 }} out:fade|global={{ duration: DURATION.fast }}>
        <span class="toast-title">{store.current.title}</span>
        {#if store.current.undo}<Button label="Undo" onclick={() => store.undo()} />{/if}
        <Button icon="close" circular variant="flat" title="Dismiss" onclick={() => store.dismiss()} />
      </div>
    {/key}
  {/if}
</div>
