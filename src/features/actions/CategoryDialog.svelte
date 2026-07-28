<script lang="ts">
  import { untrack } from 'svelte';
  import type { CategoryDownloadPath } from '../../api/torrents';
  import type { Category } from '../../api/types';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';
  import PathEntry from '../paths/PathEntry.svelte';

  interface Props {
    /** Editing when given; creating otherwise. */
    category?: Category;
    list?: (dir: string) => Promise<string[]>;
    /** `download` is null for “Default” (follow the global incomplete-folder setting). */
    onconfirm: (value: { name: string; savePath: string; download: CategoryDownloadPath }) => void;
    close: () => void;
  }
  let { category, list, onconfirm, close }: Props = $props();

  // Seeded once from the category being edited; later syncs must not overwrite edits.
  const initial = untrack(() => category);
  let name = $state(initial?.name ?? '');
  let savePath = $state(initial?.savePath ?? '');
  // download_path: missing = follow the global setting, false = off, a string = on ('' = the default folder).
  type FolderSetting = 'default' | 'yes' | 'no';
  const seeded = initial?.download_path;
  let folder = $state<FolderSetting>(seeded === undefined ? 'default' : seeded === false ? 'no' : 'yes');
  let downloadPath = $state(typeof seeded === 'string' ? seeded : '');
  const FOLDER_OPTIONS: { value: FolderSetting; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];
  const invalid = $derived(name.trim() === '' || name.includes('\\'));
  const noteId = $props.id();
</script>

<Dialog
  title={initial ? 'Edit Category' : 'New Category'}
  confirmLabel={initial ? 'Save' : 'Create'}
  confirmDisabled={invalid}
  {close}
  onconfirm={() => {
    const download = folder === 'default' ? null : { enabled: folder === 'yes', path: folder === 'yes' ? downloadPath.trim() : '' };
    onconfirm({ name: name.trim(), savePath: savePath.trim(), download });
    close();
  }}
>
  <BoxedList>
    <EntryRow title="Name" bind:value={name} disabled={initial !== undefined} autofocus={!initial} describedby={noteId} />
    <PathEntry title="Save path" bind:value={savePath} {list} placeholder="Default save path" />
    <ComboRow title="Use incomplete folder" subtitle="Keep unfinished downloads somewhere else" options={FOLDER_OPTIONS} bind:value={folder} />
    {#if folder === 'yes'}<PathEntry title="Incomplete folder" bind:value={downloadPath} {list} placeholder="Default incomplete folder" />{/if}
  </BoxedList>
  <p class="dialog-note" id={noteId}>Use “/” in the name for a subcategory, like “Linux/ISOs”.</p>
</Dialog>
