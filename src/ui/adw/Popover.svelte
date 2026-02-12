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
  let placement = $state<Placement | null>(null);
  const anchored = $derived('element' in anchor);

  $effect(() => {
    const size = { width: element.offsetWidth, height: element.offsetHeight };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if ('element' in anchor) {
      const r = anchor.element.getBoundingClientRect();
      placement = placePopover({ anchor: { left: r.left, top: r.top, width: r.width, height: r.height }, size, viewport, align: anchor.align });
    } else {
      placement = placePopover({ anchor, size, viewport });
    }
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
  class:has-arrow={anchored && placement?.arrowX != null}
  class:above={placement?.above}
  style:left="{placement?.left ?? -9999}px"
  style:top="{placement?.top ?? -9999}px"
  style:--arrow-x="{placement?.arrowX ?? 0}px"
>
  <div class="contents">{@render children()}</div>
</div>
