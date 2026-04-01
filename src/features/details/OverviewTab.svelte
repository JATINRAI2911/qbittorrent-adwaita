<script lang="ts">
  import type { PieceState, TorrentProperties } from '../../api/details';
  import type { Torrent } from '../../api/types';
  import { getAppContext, menuContext } from '../../app-context';
  import type { TorrentOption } from '../../commands/torrent-commands';
  import { formatBytes, formatDuration, formatRatio, formatSpeed } from '../../lib/format';
  import { parseTags } from '../../lib/tags';
  import Button from '../../ui/adw/Button.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import { categoryMenu, tagMenu } from '../actions/torrent-menu';
  import { formatDate } from '../table/columns';
  import PieceMap from './PieceMap.svelte';
  import PropertyRow from './PropertyRow.svelte';
  import TextListDialog from './TextListDialog.svelte';

  let { torrent: t, properties: p, pieces }: { torrent: Torrent; properties: TorrentProperties | null; pieces: PieceState[] | null } = $props();

  const app = getAppContext();
  const limit = (bytes: number) => (bytes > 0 ? formatSpeed(bytes) : 'Unlimited');
  const share = (value: number) => (value === -2 ? 'Global' : value === -1 ? 'Unlimited' : formatRatio(value));

  const OPTIONS: { option: TorrentOption; field: 'seq_dl' | 'f_l_piece_prio' | 'auto_tmm' | 'super_seeding'; title: string; subtitle?: string }[] = [
    { option: 'sequential', field: 'seq_dl', title: 'Sequential download' },
    { option: 'firstLast', field: 'f_l_piece_prio', title: 'First and last pieces first' },
    { option: 'autoManaged', field: 'auto_tmm', title: 'Automatic management', subtitle: 'Save path follows the category' },
    { option: 'superSeeding', field: 'super_seeding', title: 'Super seeding' },
  ];

  function editComment() {
    // Multi-line: comments keep their line breaks, and an empty comment removes it.
    app.dialogs.open(TextListDialog, {
      title: 'Edit Comment',
      label: 'Comment',
      value: p?.comment ?? '',
      allowEmpty: true,
      confirmLabel: 'Save',
      onconfirm: (comment: string) => void app.detailCommands.setComment(t.hash, comment),
    });
  }
</script>

{#if p === null}
  <div class="tab-loading"><Spinner size={24} label="Loading details" /></div>
{:else}
  {#if pieces}<div class="overview-pieces"><PieceMap states={pieces} have={p.pieces_have} total={p.pieces_num} /></div>{/if}
  <div class="ov-cols">
    <section class="pref-group" aria-label="Transfer">
      <div class="pg-header"><div><h4 class="heading">Transfer</h4></div></div>
      <div class="boxed-list">
        <PropertyRow title="Downloaded" value={formatBytes(p.total_downloaded)} />
        <PropertyRow title="Uploaded" value={formatBytes(p.total_uploaded)} />
        <PropertyRow title="Share ratio" value={formatRatio(p.share_ratio)} />
        <PropertyRow title="Seeds" value="{p.seeds} ({p.seeds_total})" />
        <PropertyRow title="Peers" value="{p.peers} ({p.peers_total})" />
        <PropertyRow title="Wasted" value={formatBytes(p.total_wasted)} />
        <PropertyRow title="Time active" value={formatDuration(p.time_elapsed)} />
        <PropertyRow title="Seeding time" value={formatDuration(p.seeding_time)} />
      </div>
    </section>

    <section class="pref-group" aria-label="Location">
      <div class="pg-header"><div><h4 class="heading">Location</h4></div></div>
      <div class="boxed-list">
        <PropertyRow title="Save path" value={p.save_path} mono>
          <Button label="Move…" onclick={() => app.openers.move([t])} />
        </PropertyRow>
        {#if p.download_path}<PropertyRow title="Download path" value={p.download_path} mono />{/if}
        <button type="button" class="row activatable menu-row" onclick={(event) => app.popovers.toggleMenu(categoryMenu([t], menuContext(app)), event.currentTarget, 'end')}>
          <span class="title">Category</span>
          <span class="dimmed">{t.category || 'None'}</span>
          <Icon name="pan-down" class="dimmed" />
        </button>
        <button type="button" class="row activatable menu-row" onclick={(event) => app.popovers.toggleMenu(tagMenu([t], menuContext(app)), event.currentTarget, 'end')}>
          <span class="title">Tags</span>
          <span class="dimmed">{parseTags(t.tags).join(', ') || 'None'}</span>
          <Icon name="pan-down" class="dimmed" />
        </button>
      </div>
    </section>

    <section class="pref-group" aria-label="Options">
      <div class="pg-header"><div><h4 class="heading">Options</h4></div></div>
      <div class="boxed-list">
        {#each OPTIONS as o (o.option)}
          <SwitchRow
            title={o.title}
            subtitle={o.subtitle}
            checked={t[o.field]}
            disabled={o.option === 'superSeeding' && t.progress < 1}
            onchange={(value) => void app.commands.setOption([t], o.option, value)}
          />
        {/each}
      </div>
    </section>

    <section class="pref-group" aria-label="Limits">
      <div class="pg-header"><div><h4 class="heading">Limits</h4></div><Button variant="flat" label="Edit" onclick={() => app.openers.limits([t])} /></div>
      <div class="boxed-list">
        <PropertyRow title="Download" value={limit(t.dl_limit)} />
        <PropertyRow title="Upload" value={limit(t.up_limit)} />
        <PropertyRow title="Share ratio" value={share(t.ratio_limit)} />
      </div>
    </section>

    <section class="pref-group" aria-label="Information">
      <div class="pg-header"><div><h4 class="heading">Information</h4></div></div>
      <div class="boxed-list">
        <PropertyRow title="Total size" value={formatBytes(p.total_size)} />
        <PropertyRow title="Pieces" value="{p.pieces_num.toLocaleString()} × {formatBytes(p.piece_size)}" />
        <PropertyRow title="Added" value={formatDate(p.addition_date)} />
        <PropertyRow title="Completed" value={p.completion_date > 0 ? formatDate(p.completion_date) : '–'} />
        {#if p.created_by}<PropertyRow title="Created by" value={p.created_by} />{/if}
        {#if p.creation_date > 0}<PropertyRow title="Created on" value={formatDate(p.creation_date)} />{/if}
        <PropertyRow title="Comment" value={p.comment || '–'}>
          <Button variant="flat" icon="edit" title="Edit comment" onclick={editComment} />
        </PropertyRow>
        <PropertyRow title="Info hash" value={p.infohash_v1} mono>
          <Button variant="flat" icon="copy" title="Copy info hash" onclick={() => void app.commands.copy([t], 'hashV1')} />
        </PropertyRow>
        {#if p.infohash_v2}
          <PropertyRow title="Info hash (v2)" value={p.infohash_v2} mono>
            <Button variant="flat" icon="copy" title="Copy info hash (v2)" onclick={() => void app.commands.copy([t], 'hashV2')} />
          </PropertyRow>
        {/if}
        <PropertyRow title="Private" value={p.is_private ? 'Yes' : 'No'} />
      </div>
    </section>
  </div>
{/if}

<style>
  .overview-pieces { margin: 0 0 24px; }
  .menu-row { width: 100%; border: 0; background: none; font: inherit; color: inherit; text-align: left; gap: 12px; }
  .menu-row .title { flex: 1; }
</style>
