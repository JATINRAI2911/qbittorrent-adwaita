<script lang="ts">
  import { untrack } from 'svelte';
  import { getAppContext } from '../../app-context';
  import Button from '../../ui/adw/Button.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import { DURATION, slide } from '../../ui/adw/motion';
  import PathEntry from '../paths/PathEntry.svelte';
  import type { PreferencesModel } from './preferences-model.svelte';
  import { PREFERENCES } from './schema';

  let { model, close }: { model: PreferencesModel; close: () => void } = $props();
  const app = getAppContext();
  const def = PREFERENCES.find((d) => d.key === 'scan_dirs')!;
  const list = (dir: string) => app.adding.appApi.directoryContent(dir);

  // qBittorrent's scan_dirs: {folder: 0 (save in the watched folder) | 1 (default save path) | "path"}.
  type Mode = 'watched' | 'default' | 'other';
  interface Entry {
    id: number;
    folder: string;
    mode: Mode;
    other: string;
  }
  const MODES: { value: Mode; label: string }[] = [
    { value: 'watched', label: 'The watched folder' },
    { value: 'default', label: 'Default save path' },
    { value: 'other', label: 'Another folder' },
  ];

  let nextId = 0;
  const initial = untrack(() => (model.values.scan_dirs ?? {}) as Record<string, 0 | 1 | string>);
  let entries = $state<Entry[]>(
    Object.entries(initial).map(([folder, target]) => ({
      id: ++nextId,
      folder,
      mode: target === 0 ? 'watched' : target === 1 ? 'default' : 'other',
      other: typeof target === 'string' ? target : '',
    })),
  );

  function save() {
    const scanDirs: Record<string, 0 | 1 | string> = {};
    for (const entry of entries) {
      const folder = entry.folder.trim();
      if (!folder) continue;
      scanDirs[folder] = entry.mode === 'watched' ? 0 : entry.mode === 'default' ? 1 : entry.other.trim() || 1;
    }
    model.editChanges(def, { scan_dirs: scanDirs });
    close();
  }
</script>

<Dialog title="Watched Folders" confirmLabel="Save" width={560} {close} onconfirm={save}>
  <p class="dialog-note watched-note">.torrent files that appear in these folders are added automatically.</p>
  {#each entries as entry (entry.id)}
    <div class="boxed-list" role="group" aria-label="Watched folder {entry.folder}" transition:slide={{ duration: DURATION.normal }}>
      <PathEntry title="Folder" bind:value={entry.folder} {list} />
      <ComboRow title="Save to" options={MODES} bind:value={entry.mode} />
      {#if entry.mode === 'other'}<PathEntry title="Folder for its torrents" bind:value={entry.other} {list} />{/if}
      <div class="row remove-row">
        <Button icon="trash" variant="flat" title="Remove {entry.folder || 'this folder'}" onclick={() => (entries = entries.filter((e) => e.id !== entry.id))} />
      </div>
    </div>
  {/each}
  <div class="add-row"><Button label="Add Folder" onclick={() => entries.push({ id: ++nextId, folder: '', mode: 'default', other: '' })} /></div>
</Dialog>

<style>
  .watched-note { margin: 0 4px; }
  .remove-row { justify-content: flex-end; min-height: 44px; }
  .add-row { display: flex; justify-content: center; }
</style>
