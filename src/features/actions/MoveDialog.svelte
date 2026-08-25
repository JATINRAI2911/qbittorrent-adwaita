<script lang="ts">
  import { normalizeFolder } from '../../lib/path';
  import { untrack } from 'svelte';
  import type { Torrent } from '../../api/types';
  import { formatCount } from '../../lib/format';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import PathEntry from '../paths/PathEntry.svelte';

  interface Props {
    torrents: Torrent[];
    onconfirm: (location: string) => void;
    /** Lists a folder's subfolders for autocomplete. */
    list?: (dir: string) => Promise<string[]>;
    close: () => void;
  }
  let { torrents, onconfirm, list, close }: Props = $props();

  // Starts from the current folder; later syncs must not overwrite what the user types.
  let location = $state(untrack(() => torrents[0]?.save_path ?? ''));
  // "/data/" is the same folder as "/data".
  const target = $derived(normalizeFolder(location));
  const unchanged = $derived(target === '' || torrents.every((t) => normalizeFolder(t.save_path) === target));
  const noteId = $props.id();
  const turnsOffAuto = $derived(torrents.some((t) => t.auto_tmm));
</script>

<Dialog
  title={torrents.length === 1 ? 'Move Torrent' : `Move ${formatCount(torrents.length)} Torrents`}
  confirmLabel="Move"
  confirmDisabled={unchanged}
  {close}
  onconfirm={() => {
    onconfirm(target);
    close();
  }}
>
  <BoxedList><PathEntry title="Location" bind:value={location} {list} autofocus describedby={noteId} /></BoxedList>
  <p class="dialog-note" id={noteId}>Files are moved on the server.{turnsOffAuto ? ' Automatic management will be turned off.' : ''}</p>
</Dialog>
