<script lang="ts">
  import BoxedList from '../../src/ui/adw/BoxedList.svelte';
  import ComboRow from '../../src/ui/adw/ComboRow.svelte';
  import Dialog from '../../src/ui/adw/Dialog.svelte';

  let { close }: { close: () => void } = $props();
  let value = $state('a');
</script>

<!-- A dialog whose last control is a ComboRow, for focus trap tests. -->
<Dialog title="Pick" {close}>
  <BoxedList><ComboRow title="Fruit" options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }]} bind:value /></BoxedList>
</Dialog>
