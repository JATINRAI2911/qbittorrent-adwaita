<script lang="ts">
  import type { Snippet } from 'svelte';

  let { role, children }: { role?: 'list'; children: Snippet } = $props();
</script>

<div class="boxed-list" {role}>{@render children()}</div>
