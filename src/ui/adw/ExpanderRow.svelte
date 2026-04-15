<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let { title, subtitle, expanded = $bindable(false), children }: { title: string; subtitle?: string; expanded?: boolean; children: Snippet } = $props();
  const id = $props.id();
</script>

<div class="expander" class:expanded>
  <button type="button" class="row activatable expander-toggle" aria-expanded={expanded} aria-controls={id} onclick={() => (expanded = !expanded)}>
    <span class="title-box"><span class="title">{title}</span>{#if subtitle}<span class="subtitle">{subtitle}</span>{/if}</span>
    <Icon name="pan-down" class="expander-arrow" />
  </button>
  {#if expanded}<div class="expander-content" {id}>{@render children()}</div>{/if}
</div>

<style>
  .expander-toggle { width: 100%; border: 0; background: none; font: inherit; color: inherit; text-align: left; }
  .expander :global(.expander-arrow) { transition: transform 200ms var(--ease-out-quad); opacity: 0.7; }
  .expander.expanded :global(.expander-arrow) { transform: rotate(180deg); }
  .expander-content { border-top: 1px solid var(--card-shade-color); background: color-mix(in srgb, currentColor 3%, transparent); }
  .expander-content > :global(.row) { border-bottom: 1px solid var(--card-shade-color); }
  .expander-content > :global(.row:last-child) { border-bottom: 0; }
</style>
