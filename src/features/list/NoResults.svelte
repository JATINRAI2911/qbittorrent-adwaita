<script lang="ts">
  import { getAppContext } from '../../app-context';
  import Button from '../../ui/adw/Button.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';

  const app = getAppContext();
  const term = $derived(app.list.filters.search.trim());
</script>

<StatusPage icon="search" title="No Results Found" description={term ? `No torrents match “${term}”.` : 'No torrents match the current filters.'}>
  <Button variant="suggested" pill label="Clear Filters" onclick={() => app.list.clearFilters()} />
</StatusPage>
