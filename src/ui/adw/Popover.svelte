<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PopoverAnchor } from './popovers.svelte';
  import { placePopover, type Placement } from './position';

  interface Props {
    anchor: PopoverAnchor;
    onclose: () => void;
    class?: string;
    children: Snippet;
  }
  let { anchor, onclose, class: className = '', children }: Props = $props();

  let element: HTMLDivElement;
  let contents: HTMLDivElement;
  let placement = $state<Placement | null>(null);

  function place() {
    // scrollHeight is the natural height even while max-height is capping the scroll container.
    const size = { width: element.offsetWidth, height: contents.scrollHeight };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if ('element' in anchor) {
      const r = anchor.element.getBoundingClientRect();
      placement = placePopover({ anchor: { left: r.left, top: r.top, width: r.width, height: r.height }, size, viewport, align: anchor.align });
    } else {
      placement = placePopover({ anchor, size, viewport });
    }
  }

  // Re-place when the content changes size (a submenu slides in) or the window resizes.
  $effect(() => {
    void anchor;
    place();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => place());
    observer?.observe(contents);
    if (contents.firstElementChild) observer?.observe(contents.firstElementChild);
    window.addEventListener('resize', place);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', place);
    };
  });

  $effect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (element.contains(target)) return;
      if ('element' in anchor && anchor.element.contains(target)) return;
      onclose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  });
</script>

<div
  bind:this={element}
  class="popover {className}"
  class:above={placement?.above}
  style:left="{placement?.left ?? -9999}px"
  style:top="{placement?.top ?? -9999}px"
>
  <div class="contents" bind:this={contents} style:max-height={placement?.maxHeight != null ? `${placement.maxHeight}px` : undefined}>
    {@render children()}
  </div>
</div>
