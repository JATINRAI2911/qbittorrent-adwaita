<script lang="ts">
  import { fade } from './motion';
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  interface Props {
    icon?: IconName;
    title: string;
    description?: string;
    compact?: boolean;
    children?: Snippet;
  }
  let { icon, title, description, compact = false, children }: Props = $props();
</script>

<div class="status-page" class:compact in:fade>
  {#if icon}<div class="sp-icon"><Icon name={icon} /></div>{/if}
  <div class="sp-text">
    <h1 class={compact ? 'title-2' : 'title-1'}>{title}</h1>
    {#if description}<p class="body">{description}</p>{/if}
  </div>
  {#if children}<div class="sp-actions">{@render children()}</div>{/if}
</div>
