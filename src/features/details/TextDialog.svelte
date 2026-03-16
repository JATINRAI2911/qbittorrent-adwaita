<script lang="ts">
  import { untrack } from 'svelte';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';

  interface Props {
    title: string;
    label: string;
    value?: string;
    confirmLabel: string;
    validate?: (value: string) => string | null;
    onconfirm: (value: string) => void;
    close: () => void;
  }
  let { title, label, value: initial = '', confirmLabel, validate, onconfirm, close }: Props = $props();

  // Starts from the current value; later syncs must not overwrite what the user types.
  let value = $state(untrack(() => initial));
  const problem = $derived(value.trim() === '' ? null : (validate?.(value.trim()) ?? null));
  const invalid = $derived(value.trim() === '' || value.trim() === initial.trim() || problem !== null);
</script>

<Dialog
  {title}
  {confirmLabel}
  confirmDisabled={invalid}
  {close}
  onconfirm={() => {
    onconfirm(value.trim());
    close();
  }}
>
  <BoxedList><EntryRow title={label} bind:value autofocus /></BoxedList>
  {#if problem}<p class="dialog-note error">{problem}</p>{/if}
</Dialog>
