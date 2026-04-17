<script lang="ts">
  import { untrack } from 'svelte';
  import type { CategoryDownloadPath } from '../../api/torrents';
  import type { Category } from '../../api/types';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import PathEntry from '../paths/PathEntry.svelte';

  interface Props {
    /** Editing when given; creating otherwise. */
    category?: Category;
    list?: (dir: string) => Promise<string[]>;
    onconfirm: (value: { name: string; savePath: string; download: Exclude<CategoryDownloadPath, null> }) => void;
    close: () => void;
  }
  let { category, list, onconfirm, close }: Props = $props();

  // Seeded once from the category being edited; later syncs must not overwrite edits.
  const initial = untrack(() => category);
  let name = $state(initial?.name ?? '');
  let savePath = $state(initial?.savePath ?? '');
  let useDownload = $state(typeof initial?.download_path === 'string' && initial.download_path !== '');
  let downloadPath = $state(typeof initial?.download_path === 'string' ? initial.download_path : '');
  const invalid = $derived(name.trim() === '' || name.includes('\\'));
</script>

<Dialog
  title={initial ? 'Edit Category' : 'New Category'}
  confirmLabel={initial ? 'Save' : 'Create'}
  confirmDisabled={invalid}
  {close}
  onconfirm={() => {
    onconfirm({ name: name.trim(), savePath: savePath.trim(), download: { enabled: useDownload, path: useDownload ? downloadPath.trim() : '' } });
    close();
  }}
>
  <BoxedList>
    <EntryRow title="Name" bind:value={name} disabled={initial !== undefined} autofocus={!initial} />
    <PathEntry title="Save path" bind:value={savePath} {list} placeholder="Default save path" />
    <SwitchRow title="Use an incomplete folder" subtitle="Keep unfinished downloads somewhere else" bind:checked={useDownload} />
    {#if useDownload}<PathEntry title="Incomplete folder" bind:value={downloadPath} {list} />{/if}
  </BoxedList>
  <p class="dialog-note">Use “/” in the name for a subcategory, like “Linux/ISOs”.</p>
</Dialog>
