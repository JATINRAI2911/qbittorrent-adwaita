<script lang="ts">
  import Button from './Button.svelte';
  import { DURATION, fade, rise } from './motion';
  import type { ToastStore } from './toast.svelte';

  /**
   * `behindDialog`: toasts stay visible and announced (not inert, which would silence role=status),
   * but their buttons leave the Tab order so focus stays in the dialog.
   */
  let { store, bottom = 0, behindDialog = false }: { store: ToastStore; bottom?: number; behindDialog?: boolean } = $props();
  const tabindex = $derived(behindDialog ? -1 : undefined);
</script>

<!-- The live region stays mounted: a toast inserted into it is announced; one inserted together with it often isn't. -->
<div class="toast-overlay" role="status" style:bottom="{bottom}px">
  {#if store.current}
    {#key store.current.id}
      <div class="toast" in:rise|global={{ duration: DURATION.slow, y: 16 }} out:fade|global={{ duration: DURATION.fast }}>
        <span class="toast-title">{store.current.title}</span>
        {#if store.current.undo}<Button label="Undo" {tabindex} onclick={() => store.undo()} />{/if}
        <Button icon="close" circular variant="flat" title="Dismiss" {tabindex} onclick={() => store.dismiss()} />
      </div>
    {/key}
  {/if}
</div>
