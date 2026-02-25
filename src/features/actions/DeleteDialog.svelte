<script lang="ts">
  import type { Torrent } from '../../api/types';
  import { formatBytes, formatCount } from '../../lib/format';
  import AlertDialog from '../../ui/adw/AlertDialog.svelte';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';

  interface Props {
    torrents: Torrent[];
    onconfirm: (deleteFiles: boolean) => void;
    close: () => void;
  }
  let { torrents, onconfirm, close }: Props = $props();

  let deleteFiles = $state(false);
  const one = $derived(torrents.length === 1);
  const heading = $derived(one ? 'Delete Torrent?' : `Delete ${formatCount(torrents.length)} Torrents?`);
  const body = $derived(
    one
      ? `“${torrents[0]!.name}” will be removed from the transfer list.`
      : `${formatCount(torrents.length)} torrents (${formatBytes(torrents.reduce((sum, t) => sum + t.size, 0))}) will be removed from the transfer list.`,
  );
  const responses = $derived([
    { id: 'cancel', label: 'Cancel' },
    { id: 'delete', label: deleteFiles ? 'Delete Files' : 'Remove', variant: 'destructive' as const },
  ]);
</script>

<AlertDialog {heading} {body} {responses} {close} onresponse={(id) => id === 'delete' && onconfirm(deleteFiles)}>
  <BoxedList>
    <SwitchRow
      title="Also delete files"
      subtitle={deleteFiles ? 'Files will be permanently deleted' : 'Downloaded data stays on disk'}
      subtitleTone={deleteFiles ? 'error' : undefined}
      bind:checked={deleteFiles}
    />
  </BoxedList>
</AlertDialog>
