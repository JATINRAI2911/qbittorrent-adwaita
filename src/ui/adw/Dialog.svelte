<script lang="ts">
  import { DURATION, rise } from './motion';
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';

  interface Props {
    title: string;
    width?: number;
    close: () => void;
    confirmLabel?: string;
    confirmVariant?: 'suggested' | 'destructive';
    confirmDisabled?: boolean;
    onconfirm?: () => void;
    children: Snippet;
  }
  let { title, width = 460, close, confirmLabel = 'Done', confirmVariant = 'suggested', confirmDisabled = false, onconfirm, children }: Props = $props();

  const titleId = $props.id();
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let root: HTMLDivElement;

  $effect(() => {
    root.querySelector<HTMLElement>('[autofocus], input, select, textarea')?.focus();
    return () => previous?.focus();
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (onconfirm && !confirmDisabled) onconfirm();
  }
</script>

<div class="dialog" in:rise={{ duration: DURATION.slow, scale: 0.96 }} out:rise={{ duration: DURATION.fast, scale: 0.96 }} role="dialog" aria-modal="true" aria-labelledby={titleId} style:width="{width}px" bind:this={root}>
  <header class="headerbar dialog-header">
    <div class="hb-start">{#if onconfirm}<Button label="Cancel" onclick={close} />{/if}</div>
    <div class="hb-title"><div class="window-title"><span class="title" id={titleId}>{title}</span></div></div>
    <div class="hb-end">
      {#if onconfirm}
        <Button label={confirmLabel} variant={confirmVariant} disabled={confirmDisabled} onclick={() => onconfirm()} />
      {:else}
        <button type="button" class="btn image-button circular close-button" aria-label="Close" onclick={close}>
          <svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.8 3.8 8.4 8.4m0-8.4-8.4 8.4" fill="none" stroke="currentColor" /></svg>
        </button>
      {/if}
    </div>
  </header>
  <form class="dialog-content" onsubmit={submit}>
    {@render children()}
    <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
  </form>
</div>
