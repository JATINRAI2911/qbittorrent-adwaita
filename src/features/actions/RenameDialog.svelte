<script lang="ts">
  import { untrack } from 'svelte';
  import type { Torrent } from '../../api/types';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';

  interface Props {
    torrent: Torrent;
    onconfirm: (name: string) => void;
    close: () => void;
  }
  let { torrent, onconfirm, close }: Props = $props();

  // Starts from the current name; later syncs must not overwrite what the user types.
  let name = $state(untrack(() => torrent.name));
  const invalid = $derived(name.trim() === '' || name.trim() === torrent.name);
</script>

<Dialog
  title="Rename Torrent"
  confirmLabel="Rename"
  confirmDisabled={invalid}
  {close}
  onconfirm={() => {
    onconfirm(name.trim());
    close();
  }}
>
  <BoxedList><EntryRow title="Name" bind:value={name} autofocus /></BoxedList>
</Dialog>
