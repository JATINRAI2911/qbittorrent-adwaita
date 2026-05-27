<script lang="ts">
  import { DURATION, fade } from './motion';
  import type { Snippet } from 'svelte';

  let { start, title, end }: { start?: Snippet; title?: Snippet; end?: Snippet } = $props();
</script>

<header class="headerbar" in:fade={{ duration: DURATION.fast }}>
  <div class="hb-start">{@render start?.()}</div>
  <div class="hb-title">{@render title?.()}</div>
  <div class="hb-end">{@render end?.()}</div>
</header>
