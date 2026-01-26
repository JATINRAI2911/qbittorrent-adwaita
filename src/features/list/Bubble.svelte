<script lang="ts">
  import type { Torrent } from '../../api/types';
  import Icon from '../../ui/adw/Icon.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import { bubbleKind } from './describe';

  let { torrent }: { torrent: Torrent } = $props();
  const kind = $derived(bubbleKind(torrent));
</script>

<div class="bubble {kind}" aria-hidden="true">
  {#if kind === 'busy'}
    <Spinner size={16} />
  {:else if kind === 'queued'}
    <span class="bubble-num">{torrent.priority > 0 ? torrent.priority : '·'}</span>
  {:else if kind === 'error'}
    <Icon name="exclamation" />
  {:else if kind === 'stopped'}
    <Icon name="pause" />
  {:else}
    <Icon name={torrent.progress < 1 ? 'go-down' : 'go-up'} />
  {/if}
</div>

<style>
  .bubble {
    width: 32px; height: 32px; border-radius: 50%; flex: none; display: grid; place-items: center;
    color: #fff; background: color-mix(in srgb, var(--window-fg-color) 50%, transparent);
  }
  :global([data-scheme='dark']) .bubble:is(.stopped, .queued) { color: rgb(0 0 6 / 80%); }
  .bubble:is(.downloading, .seeding, .busy) { background: var(--accent-bg-color); color: var(--accent-fg-color); }
  .bubble.error { background: var(--error-bg-color); color: var(--error-fg-color); }
  .bubble.stalled { background: var(--warning-bg-color); color: var(--warning-fg-color); }
  .bubble.idle { background: color-mix(in srgb, var(--accent-bg-color) 22%, transparent); color: var(--accent-color); }
  .bubble :global(svg.i) { stroke-width: 2; }
  .bubble-num { font-weight: 800; font-size: 13px; }
</style>
