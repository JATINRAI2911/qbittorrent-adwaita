<script lang="ts">
  import type { Torrent } from '../../api/types';
  import Icon from '../../ui/adw/Icon.svelte';
  import ProgressBar from '../../ui/adw/ProgressBar.svelte';
  import Bubble from './Bubble.svelte';
  import { describeRow, etaText, isInactive, parseTags, progressTone, showProgress } from './describe';

  let { torrent: t }: { torrent: Torrent } = $props();

  const segments = $derived(describeRow(t));
  const eta = $derived(etaText(t));
  const tags = $derived(parseTags(t.tags));
</script>

<div class="row torrent-row" class:inactive={isInactive(t)} role="listitem">
  <Bubble torrent={t} />
  <div class="t-main">
    <div class="t-line">
      <span class="t-name heading" title={t.name} dir="auto">{t.name}</span>
      {#if t.category || tags.length}
        <span class="t-meta caption">
          {#if t.category}<span class="t-m"><Icon name="folder" />{t.category}</span>{/if}
          {#if tags.length}<span class="t-m"><Icon name="tag" />{tags.join(', ')}</span>{/if}
        </span>
      {/if}
    </div>
    <div class="t-sub">
      <span class="subtitle numeric">
        {#each segments as segment, i (i)}
          {#if i > 0}<span class="sep">-</span>{/if}<span class={segment.tone ?? ''}>{segment.text}</span>
        {/each}
      </span>
      {#if eta}<span class="subtitle numeric eta">{eta}</span>{/if}
    </div>
    {#if showProgress(t)}
      <ProgressBar value={t.progress} tone={progressTone(t)} thin label="Progress of {t.name}" />
    {/if}
  </div>
</div>

<style>
  .torrent-row { gap: 12px; padding: 10px 12px 10px 14px; min-height: 64px; }
  .t-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .t-line { display: flex; align-items: baseline; gap: 16px; min-width: 0; }
  .t-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .t-meta { flex: none; display: flex; gap: 12px; max-width: 45%; overflow: hidden; white-space: nowrap; opacity: var(--dim-opacity); }
  .t-m { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .t-m :global(svg.i) { width: 12px; height: 12px; stroke-width: 2; align-self: center; }
  .t-sub { display: flex; gap: 12px; min-width: 0; }
  .t-sub .subtitle { font-size: smaller; opacity: var(--dim-opacity); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .t-sub .subtitle:first-child { flex: 1; min-width: 0; }
  .t-sub .subtitle:has(:global(.warning), :global(.error)) { opacity: 1; }
  .t-sub .subtitle:has(:global(.warning), :global(.error)) > :not(:global(.warning), :global(.error)) { opacity: var(--dim-opacity); }
  .eta { flex: none; }
  .sep { margin: 0 6px; opacity: 0.7; }
  .inactive .t-name, .inactive .t-meta { color: color-mix(in srgb, var(--window-fg-color) 50%, transparent); }
  .torrent-row :global(.progressbar) { margin-top: 4px; }
</style>
