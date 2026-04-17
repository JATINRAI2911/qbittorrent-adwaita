<script lang="ts">
  import { getAppContext } from '../../app-context';
  import { formatCount } from '../../lib/format';
  import { parseTags } from '../../lib/tags';
  import AlertDialog from '../../ui/adw/AlertDialog.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();
  const tags = $derived([...app.session.tags].sort((a, b) => a.localeCompare(b)));
  const counts = $derived.by(() => {
    const map = new Map<string, number>();
    for (const t of app.session.torrents.values()) for (const tag of parseTags(t.tags)) map.set(tag, (map.get(tag) ?? 0) + 1);
    return map;
  });

  function remove(tag: string) {
    app.dialogs.open(AlertDialog, {
      heading: 'Delete Tag?',
      body: `“${tag}” is removed from every torrent that has it.`,
      responses: [{ id: 'cancel', label: 'Cancel' }, { id: 'delete', label: 'Delete', variant: 'destructive' }],
      onresponse: (id: string) => id === 'delete' && void app.commands.deleteTags([tag]),
    });
  }
</script>

<Dialog title="Tags" width={480} {close}>
  {#if tags.length === 0}
    <StatusPage compact icon="tag" title="No Tags" description="Tags label torrents across categories." />
  {:else}
    <div class="boxed-list" role="list" aria-label="Tags">
      {#each tags as tag (tag)}
        {@const n = counts.get(tag) ?? 0}
        <div class="row" role="listitem">
          <span class="title-box"><span class="title">{tag}</span><span class="subtitle">{formatCount(n)} {n === 1 ? 'torrent' : 'torrents'}</span></span>
          <Button variant="flat" icon="trash" title="Delete {tag}" onclick={() => remove(tag)} />
        </div>
      {/each}
    </div>
  {/if}
  <div class="manage-actions"><Button label="New Tag…" onclick={() => app.openers.newTag([])} /></div>
</Dialog>

<style>
  .manage-actions { display: flex; justify-content: center; }
</style>
