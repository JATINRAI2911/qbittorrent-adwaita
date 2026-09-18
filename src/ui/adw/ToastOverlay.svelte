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

<!-- The live region stays mounted and holds only the current title, so each toast is announced once,
     without its button labels or the previous toast still fading out. -->
<span class="visually-hidden" role="status">{store.current?.title ?? ''}</span>
<div class="toast-overlay" style:bottom="{bottom}px">
  {#if store.current}
    {#key store.current.id}
      <div class="toast" in:rise|global={{ duration: DURATION.slow, y: 16 }} out:fade|global={{ duration: DURATION.fast }}>
        <span class="toast-title" aria-hidden="true">{store.current.title}</span>
        {#if store.current.undo}<Button label="Undo" {tabindex} onclick={() => store.undo()} />{/if}
        <Button icon="close" circular variant="flat" title="Dismiss" {tabindex} onclick={() => store.dismiss()} />
      </div>
    {/key}
  {/if}
</div>
