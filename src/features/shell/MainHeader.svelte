<script lang="ts">
  import type { ServerState, Torrent } from '../../api/types';
  import { subtitleText, summarize } from '../../state/summary';
  import HeaderBar from '../../ui/adw/HeaderBar.svelte';
  import WindowTitle from '../../ui/adw/WindowTitle.svelte';

  interface Props {
    torrents: ReadonlyMap<string, Torrent>;
    server: Partial<ServerState>;
    offline: boolean;
  }
  let { torrents, server, offline }: Props = $props();

  const subtitle = $derived(subtitleText(summarize(torrents.values(), server), { offline, empty: torrents.size === 0 }));
</script>

<HeaderBar>
  {#snippet title()}<WindowTitle title="qBittorrent" {subtitle} />{/snippet}
</HeaderBar>
