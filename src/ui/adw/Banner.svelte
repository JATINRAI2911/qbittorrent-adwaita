<script lang="ts">
  import { slide } from './motion';
  import Button from './Button.svelte';

  interface Props {
    title: string;
    actionLabel?: string;
    onaction?: () => void;
    tone?: 'neutral' | 'warning' | 'error';
    /** Shown after the title but not announced: for text that changes often, like a countdown. */
    detail?: string;
  }
  let { title, actionLabel, onaction, tone = 'neutral', detail }: Props = $props();
</script>

<div class="banner tone-{tone}" transition:slide>
  <div class="banner-inner">
    <span class="banner-title"><span role="alert">{title}</span>{#if detail} <span class="banner-detail">{detail}</span>{/if}</span>
    {#if actionLabel}
      <Button label={actionLabel} variant={tone === 'error' ? 'suggested' : 'default'} onclick={onaction} />
    {/if}
  </div>
</div>
