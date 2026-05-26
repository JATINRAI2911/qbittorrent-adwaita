<script lang="ts">
  import { slide } from './motion';
  import Button from './Button.svelte';

  interface Props {
    title: string;
    actionLabel?: string;
    onaction?: () => void;
    tone?: 'neutral' | 'warning' | 'error';
  }
  let { title, actionLabel, onaction, tone = 'neutral' }: Props = $props();
</script>

<div class="banner tone-{tone}" role="alert" transition:slide>
  <div class="banner-inner">
    <span class="banner-title">{title}</span>
    {#if actionLabel}
      <Button label={actionLabel} variant={tone === 'error' ? 'suggested' : 'default'} onclick={onaction} />
    {/if}
  </div>
</div>
