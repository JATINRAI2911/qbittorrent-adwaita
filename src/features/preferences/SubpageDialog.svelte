<script lang="ts">
  import Dialog from '../../ui/adw/Dialog.svelte';
  import PreferencesGroup from './PreferencesGroup.svelte';
  import type { PreferencesModel } from './preferences-model.svelte';
  import { subpageRows, type PrefDef } from './schema';

  interface Props {
    title: string;
    subpage: string;
    model: PreferencesModel;
    oncustom?: (def: PrefDef) => void;
    close: () => void;
  }
  let { title, subpage, model, oncustom, close }: Props = $props();
  // Same rows and instant apply as the page; pending edits are sent when it closes.
  const rows = $derived(subpageRows(subpage));

  $effect(() => () => void model.flush());
</script>

<Dialog {title} width={520} {close}>
  <PreferencesGroup title={title} defs={rows} {model} {oncustom} />
</Dialog>
