<script lang="ts">
  import type { Snippet } from 'svelte';

  let { start, title, end }: { start?: Snippet; title?: Snippet; end?: Snippet } = $props();
</script>

<header class="headerbar">
  <div class="hb-start">{@render start?.()}</div>
  <div class="hb-title">{@render title?.()}</div>
  <div class="hb-end">{@render end?.()}</div>
</header>
