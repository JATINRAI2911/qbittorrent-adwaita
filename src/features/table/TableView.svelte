<script lang="ts">
  import { getAppContext } from '../../app-context';
  import Button from '../../ui/adw/Button.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import NoResults from '../list/NoResults.svelte';
  import TableGrid from './TableGrid.svelte';

  const app = getAppContext();
</script>

{#if app.session.torrents.size === 0}
  <StatusPage icon="magnet" title="No Torrents" description="Drop .torrent files here, or paste a magnet link.">
    <Button variant="suggested" pill label="Add Torrents…" onclick={() => app.openers.add()} />
  </StatusPage>
{:else if app.table.rows.length === 0}
  <NoResults />
{:else}
  <TableGrid />
{/if}
