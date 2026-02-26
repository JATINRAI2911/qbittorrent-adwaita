<script lang="ts">
  import type { ServerState, Torrent } from '../../api/types';
  import { getAppContext } from '../../app-context';
  import { formatCount } from '../../lib/format';
  import { subtitleText, summarize } from '../../state/summary';
  import Button from '../../ui/adw/Button.svelte';
  import HeaderBar from '../../ui/adw/HeaderBar.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import WindowTitle from '../../ui/adw/WindowTitle.svelte';

  interface Props {
    torrents: ReadonlyMap<string, Torrent>;
    server: Partial<ServerState>;
    offline: boolean;
  }
  let { torrents, server, offline }: Props = $props();

  const app = getAppContext();
  const subtitle = $derived(subtitleText(summarize(torrents.values(), server), { offline, empty: torrents.size === 0 }));
  const count = $derived(app.selection.size);

  function openMainMenu(event: MouseEvent) {
    app.popovers.toggleMenu(
      { sections: [[{ label: 'Log Out', action: () => void app.session.logout().then(() => app.selection.exit()) }]] },
      event.currentTarget as HTMLElement,
      'end',
    );
  }

  function openSelectionMenu(event: MouseEvent) {
    app.popovers.toggleMenu(
      {
        sections: [
          [
            { label: 'Select All', accel: 'Ctrl+A', action: () => app.selection.selectAll(app.list.allHashes) },
            { label: 'Select None', action: () => app.selection.selected.clear() },
          ],
        ],
      },
      event.currentTarget as HTMLElement,
    );
  }
</script>

{#if app.selection.mode}
  <HeaderBar>
    {#snippet start()}<Button label="Cancel" onclick={() => app.selection.exit()} />{/snippet}
    {#snippet title()}
      <button type="button" class="btn flat title-menu" aria-haspopup="menu" onclick={openSelectionMenu}>
        <span class="heading">{count ? `${formatCount(count)} Selected` : 'Click on Items to Select Them'}</span>
        <Icon name="pan-down" />
      </button>
    {/snippet}
  </HeaderBar>
{:else}
  <HeaderBar>
    {#snippet title()}<WindowTitle title="qBittorrent" {subtitle} />{/snippet}
    {#snippet end()}
      <Button icon="selection-mode" title="Select" onclick={() => app.selection.enter()} />
      <Button icon="open-menu" title="Main Menu" onclick={openMainMenu} />
    {/snippet}
  </HeaderBar>
{/if}
