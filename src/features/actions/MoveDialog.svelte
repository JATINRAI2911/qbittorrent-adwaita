<script lang="ts">
  import { untrack } from 'svelte';
  import type { Torrent } from '../../api/types';
  import { formatCount } from '../../lib/format';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';

  interface Props {
    torrents: Torrent[];
    onconfirm: (location: string) => void;
    close: () => void;
  }
  let { torrents, onconfirm, close }: Props = $props();

  // Starts from the current folder; later syncs must not overwrite what the user types.
  let location = $state(untrack(() => torrents[0]?.save_path ?? ''));
  const unchanged = $derived(location.trim() === '' || torrents.every((t) => t.save_path === location.trim()));
  const turnsOffAuto = $derived(torrents.some((t) => t.auto_tmm));
</script>

<Dialog
  title={torrents.length === 1 ? 'Move Torrent' : `Move ${formatCount(torrents.length)} Torrents`}
  confirmLabel="Move"
  confirmDisabled={unchanged}
  {close}
  onconfirm={() => {
    onconfirm(location.trim());
    close();
  }}
>
  <BoxedList><EntryRow title="Location" bind:value={location} autofocus /></BoxedList>
  <p class="dialog-note">Files are moved on the server.{turnsOffAuto ? ' Automatic management will be turned off.' : ''}</p>
</Dialog>
