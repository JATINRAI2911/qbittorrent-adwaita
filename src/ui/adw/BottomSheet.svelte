<script lang="ts">
  import type { Snippet } from 'svelte';
  import { dragFraction, settleSheet } from './sheet-drag';

  interface Props {
    mode: 'open' | 'bar';
    /** fraction of the window height */
    height: number;
    label: string;
    onresize: (fraction: number) => void;
    oncollapse: () => void;
    head: Snippet;
    bar: Snippet;
    children: Snippet;
  }
  let { mode, height, label, onresize, oncollapse, head, bar, children }: Props = $props();

  let drag = $state<{ startY: number; start: number; fraction: number } | null>(null);
  const shown = $derived(drag ? Math.max(0.1, drag.fraction) : height);

  function release(fraction: number) {
    const settled = settleSheet(fraction);
    if (settled.collapse) oncollapse();
    else onresize(settled.fraction);
  }

  function onpointerdown(event: PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    drag = { startY: event.clientY, start: height, fraction: height };
  }

  function onpointermove(event: PointerEvent) {
    if (drag) drag.fraction = dragFraction(drag.start, drag.startY, event.clientY, window.innerHeight);
  }

  function onpointerup(event: PointerEvent) {
    if (!drag) return;
    const fraction = dragFraction(drag.start, drag.startY, event.clientY, window.innerHeight);
    drag = null;
    release(fraction);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    event.stopPropagation();
    release(Math.round((height + (event.key === 'ArrowUp' ? 0.05 : -0.05)) * 100) / 100);
  }
</script>

{#if mode === 'bar'}
  <div class="sheet sheet-bar" role="region" aria-label={label}>{@render bar()}</div>
{:else}
  <div class="sheet" class:dragging={drag !== null} role="region" aria-label={label} style:height="{shown * 100}vh">
    <!-- A focusable separator is the ARIA window-splitter pattern: it's the keyboard way to resize. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      class="drag-handle-area"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize {label.toLowerCase()}"
      aria-valuemin={22}
      aria-valuemax={92}
      aria-valuenow={Math.round(height * 100)}
      tabindex="0"
      {onpointerdown}
      {onpointermove}
      {onpointerup}
      onpointercancel={() => (drag = null)}
      {onkeydown}
    >
      <div class="drag-handle"></div>
    </div>
    {@render head()}
    <div class="sheet-body">{@render children()}</div>
  </div>
{/if}
