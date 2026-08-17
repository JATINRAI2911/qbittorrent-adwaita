<script lang="ts">
  import { fade, rise } from '../../src/ui/adw/motion';
  let { show }: { show: boolean } = $props();
</script>

<!-- Separate in:/out: transitions, like the path suggestions list. -->
{#if show}<ul data-testid="list" in:rise={{ duration: 150, y: -4 }} out:fade={{ duration: 100 }}><li>item</li></ul>{/if}
