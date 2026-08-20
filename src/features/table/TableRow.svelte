<script lang="ts">
  import type { Torrent } from '../../api/types';
  import { getAppContext } from '../../app-context';
  import { formatBytes, formatPercent, formatRatio, formatSpeed } from '../../lib/format';
  import { parseTags } from '../../lib/tags';
  import ProgressBar from '../../ui/adw/ProgressBar.svelte';
  import Bubble from '../list/Bubble.svelte';
  import { etaText, isInactive, progressTone } from '../list/describe';
  import { COLUMNS, connectedPeers, connectedSeeds, formatDate, peersText, statusText, type ColumnId } from './columns';

  let { torrent: t, columns, template, index }: { torrent: Torrent; columns: readonly ColumnId[]; template: string; index: number } = $props();

  const app = getAppContext();
  const selected = $derived(app.selection.has(t.hash));
</script>

<div
  class="cv-row"
  class:selected
  class:inactive={isInactive(t)}
  class:kfocus={app.selection.keyboard && app.selection.focus === t.hash}
  class:menu-target={app.selection.menuTarget === t.hash}
  data-hash={t.hash}
  tabindex="-1"
  role="row"
  aria-rowindex={index + 2}
  aria-selected={selected}
  style:grid-template-columns={template}
>
  {#each columns as id (id)}
    <div class="cv-c {id}" class:end={COLUMNS[id].align === 'end'} role="gridcell">
      {#if id === 'name'}
        <Bubble torrent={t} small /><span class="ellipsis" dir="auto" title={t.name}>{t.name}</span>
      {:else if id === 'status'}
        {statusText(t)}
      {:else if id === 'progress'}
        <ProgressBar value={t.progress} tone={progressTone(t)} thin label="Progress of {t.name}" /><span class="pct numeric">{formatPercent(t.progress)}</span>
      {:else if id === 'size'}
        <span class="numeric">{formatBytes(t.size)}</span>
      {:else if id === 'down'}
        <span class="numeric">{t.dlspeed > 0 ? formatSpeed(t.dlspeed) : ''}</span>
      {:else if id === 'up'}
        <span class="numeric">{t.upspeed > 0 ? formatSpeed(t.upspeed) : ''}</span>
      {:else if id === 'eta'}
        {etaText(t)}
      {:else if id === 'seeds'}
        <span class="numeric">{peersText(connectedSeeds(t), t.num_complete)}</span>
      {:else if id === 'peers'}
        <span class="numeric">{peersText(connectedPeers(t), t.num_incomplete)}</span>
      {:else if id === 'ratio'}
        <span class="numeric">{formatRatio(t.ratio)}</span>
      {:else if id === 'category'}
        {t.category}
      {:else if id === 'tags'}
        {parseTags(t.tags).join(', ')}
      {:else if id === 'added'}
        {formatDate(t.added_on)}
      {/if}
    </div>
  {/each}
</div>
