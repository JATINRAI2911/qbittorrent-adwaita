<script lang="ts">
  import type { PieceState } from '../../api/details';
  import { formatCount } from '../../lib/format';
  import { pieceSegments } from './pieces';

  let { states, have, total }: { states: readonly PieceState[]; have: number; total: number } = $props();
  const segments = $derived(pieceSegments(states));
</script>

<div class="pieces" role="img" aria-label="{formatCount(have)} of {formatCount(total)} pieces downloaded">
  <svg viewBox="0 0 1000 1" preserveAspectRatio="none" aria-hidden="true">
    {#each segments as segment (segment.start)}
      <rect x={segment.start * 1000} y="0" width={(segment.end - segment.start) * 1000} height="1" class={segment.kind} />
    {/each}
  </svg>
</div>

<style>
  .pieces { height: 8px; border-radius: 99px; background: var(--trough-color); overflow: hidden; }
  svg { display: block; width: 100%; height: 100%; }
  rect.done { fill: var(--accent-bg-color); }
  rect.partial { fill: color-mix(in srgb, var(--accent-bg-color) 45%, transparent); }
</style>
