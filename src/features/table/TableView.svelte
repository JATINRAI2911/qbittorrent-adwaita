<script lang="ts">
  import { getAppContext } from '../../app-context';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import NoResults from '../list/NoResults.svelte';
  import TableGrid from './TableGrid.svelte';

  const app = getAppContext();
</script>

{#if app.session.torrents.size === 0}
  <StatusPage icon="magnet" title="No Torrents" description="Torrents you add will appear here." />
{:else if app.table.rows.length === 0}
  <NoResults />
{:else}
  <TableGrid />
{/if}
