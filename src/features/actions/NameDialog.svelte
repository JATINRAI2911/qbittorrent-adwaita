<script lang="ts">
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';

  interface Props {
    title: string;
    confirmLabel: string;
    pathLabel?: string;
    forbidComma?: boolean;
    onconfirm: (name: string, path: string) => void;
    close: () => void;
  }
  let { title, confirmLabel, pathLabel, forbidComma = false, onconfirm, close }: Props = $props();

  let name = $state('');
  let path = $state('');
  const hasComma = $derived(forbidComma && name.includes(','));
</script>

<Dialog
  {title}
  {confirmLabel}
  confirmDisabled={name.trim() === '' || hasComma}
  {close}
  onconfirm={() => {
    onconfirm(name.trim(), path.trim());
    close();
  }}
>
  <BoxedList>
    <EntryRow title="Name" bind:value={name} autofocus />
    {#if pathLabel}<EntryRow title={pathLabel} bind:value={path} />{/if}
  </BoxedList>
  {#if hasComma}<p class="dialog-note error">Tag names can’t contain commas.</p>{/if}
</Dialog>
