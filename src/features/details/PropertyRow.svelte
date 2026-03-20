<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, value, mono = false, children }: { title: string; value: string; mono?: boolean; children?: Snippet } = $props();
</script>

<div class="row property">
  <div class="title-box">
    <span class="subtitle">{title}</span>
    <span class="title numeric" class:monospace={mono} class:wrap={mono}>{value}</span>
  </div>
  {@render children?.()}
</div>

<style>
  .property .title-box .subtitle { font-size: smaller; }
  .property .title { user-select: text; }
  .wrap { overflow-wrap: anywhere; }
</style>
