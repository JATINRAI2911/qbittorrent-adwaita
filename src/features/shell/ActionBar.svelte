<script lang="ts">
  import type { Torrent } from '../../api/types';
  import { getAppContext, menuContext, targetTorrents } from '../../app-context';
  import Button from '../../ui/adw/Button.svelte';
  import { categoryMenu, tagMenu, torrentMenu } from '../actions/torrent-menu';

  const app = getAppContext();
  const targets = $derived(targetTorrents(app));
  const none = $derived(targets.length === 0);
  const stopped = (t: Torrent) => t.state === 'stoppedDL' || t.state === 'stoppedUP';

  const menu = (build: typeof torrentMenu, align: 'start' | 'end') => (event: MouseEvent) =>
    app.popovers.toggleMenu(build(targets, menuContext(app)), event.currentTarget as HTMLElement, align);
</script>

<div class="bottom-bar">
  <div class="actionbar" role="toolbar" aria-label="Selection actions">
    <Button icon="play" label="Start" disabled={!targets.some(stopped)} onclick={() => void app.commands.start(targets)} />
    <Button icon="pause" label="Stop" disabled={targets.every(stopped)} onclick={() => void app.commands.stop(targets)} />
    <span class="spacer"></span>
    <Button icon="folder" label="Category" disabled={none} onclick={menu(categoryMenu, 'start')} />
    <Button icon="tag" label="Tags" disabled={none} onclick={menu(tagMenu, 'start')} />
    <Button icon="folder" label="Move…" disabled={none} onclick={() => app.openers.move(targets)} />
    <Button icon="view-more" title="More" disabled={none} onclick={menu(torrentMenu, 'end')} />
    <span class="spacer"></span>
    <Button icon="trash" title="Delete" variant="destructive" disabled={none} onclick={() => app.openers.confirmDelete(targets)} />
  </div>
</div>
