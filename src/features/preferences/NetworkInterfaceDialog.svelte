<script lang="ts">
  import { getAppContext } from '../../app-context';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import type { PreferencesModel } from './preferences-model.svelte';
  import { PREFERENCES } from './schema';

  let { model, close }: { model: PreferencesModel; close: () => void } = $props();
  const app = getAppContext();
  const def = PREFERENCES.find((d) => d.key === 'current_network_interface')!;

  let interfaces = $state<{ name: string; value: string }[]>([]);
  let addresses = $state<string[]>([]);
  const current = $derived(String(model.values.current_network_interface ?? ''));
  const currentName = $derived(String(model.values.current_interface_name ?? ''));
  const address = $derived(String(model.values.current_interface_address ?? ''));

  // The saved interface stays selectable even when it's gone (e.g. a VPN that isn't up).
  const interfaceOptions = $derived([
    { value: '', label: 'Any interface' },
    ...interfaces.map((i) => ({ value: i.value, label: i.name })),
    ...(current && !interfaces.some((i) => i.value === current) ? [{ value: current, label: currentName || current }] : []),
  ]);
  const addressOptions = $derived([
    { value: '', label: 'All addresses' },
    { value: '0.0.0.0', label: 'All IPv4 addresses' },
    { value: '::', label: 'All IPv6 addresses' },
    ...addresses.map((a) => ({ value: a, label: a })),
    ...(address && !['', '0.0.0.0', '::', ...addresses].includes(address) ? [{ value: address, label: address }] : []),
  ]);

  $effect(() => {
    void app.adding.appApi.networkInterfaces().then((list) => (interfaces = list)).catch(() => {});
  });

  $effect(() => {
    const iface = current;
    addresses = [];
    if (iface) void app.adding.appApi.interfaceAddresses(iface).then((list) => (addresses = list)).catch(() => {});
  });
</script>

<Dialog title="Network Interface" width={480} {close}>
  <BoxedList>
    <ComboRow
      title="Interface"
      options={interfaceOptions}
      bind:value={() => current, (value) => model.editChanges(def, { current_network_interface: value, current_interface_address: '' })}
    />
    <ComboRow title="Address" options={addressOptions} bind:value={() => address, (value) => model.editChanges(def, { current_interface_address: value })} />
  </BoxedList>
  <p class="dialog-note">qBittorrent only connects through the chosen interface and address.</p>
</Dialog>
