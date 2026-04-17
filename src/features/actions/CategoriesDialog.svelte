<script lang="ts">
  import { getAppContext } from '../../app-context';
  import { formatCount } from '../../lib/format';
  import AlertDialog from '../../ui/adw/AlertDialog.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();
  const categories = $derived([...app.session.categories.values()].sort((a, b) => a.name.localeCompare(b.name)));
  const counts = $derived.by(() => {
    const map = new Map<string, number>();
    for (const t of app.session.torrents.values()) if (t.category) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return map;
  });

  function remove(name: string) {
    app.dialogs.open(AlertDialog, {
      heading: 'Remove Category?',
      body: `Torrents in “${name}” become uncategorized. Their files stay where they are.`,
      responses: [{ id: 'cancel', label: 'Cancel' }, { id: 'remove', label: 'Remove', variant: 'destructive' }],
      onresponse: (id: string) => id === 'remove' && void app.commands.removeCategories([name]),
    });
  }
</script>

<Dialog title="Categories" width={520} {close}>
  {#if categories.length === 0}
    <StatusPage compact icon="folder" title="No Categories" description="Categories group torrents and can give them their own save folder." />
  {:else}
    <div class="boxed-list" role="list" aria-label="Categories">
      {#each categories as category (category.name)}
        {@const n = counts.get(category.name) ?? 0}
        <div class="row" role="listitem">
          <span class="title-box">
            <span class="title">{category.name}</span>
            <span class="subtitle">{formatCount(n)} {n === 1 ? 'torrent' : 'torrents'}{category.savePath ? ` · ${category.savePath}` : ''}</span>
          </span>
          <Button variant="flat" icon="edit" title="Edit {category.name}" onclick={() => app.openers.editCategory(category)} />
          <Button variant="flat" icon="trash" title="Remove {category.name}" onclick={() => remove(category.name)} />
        </div>
      {/each}
    </div>
  {/if}
  <div class="manage-actions"><Button label="New Category…" onclick={() => app.openers.newCategory([])} /></div>
</Dialog>

<style>
  .manage-actions { display: flex; justify-content: center; }
</style>
