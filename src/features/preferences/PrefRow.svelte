<script lang="ts">
  import { getAppContext } from '../../app-context';
  import ActionRow from '../../ui/adw/ActionRow.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';
  import SpinRow from '../../ui/adw/SpinRow.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import TimeRow from '../../ui/adw/TimeRow.svelte';
  import TextListDialog from '../details/TextListDialog.svelte';
  import PathEntry from '../paths/PathEntry.svelte';
  import LimitRow from './LimitRow.svelte';
  import { localeOptions } from './locales';
  import type { PreferencesModel } from './preferences-model.svelte';
  import type { PrefDef } from './schema';
  import { maskApiKey, type LimitValue } from './values';

  interface Props {
    def: PrefDef;
    model: PreferencesModel;
    onsubpage?: (def: PrefDef) => void;
    oncustom?: (def: PrefDef) => void;
  }
  let { def, model, onsubpage, oncustom }: Props = $props();
  const app = getAppContext();

  const ui = $derived(model.ui(def));
  const subtitle = $derived([def.subtitle, def.restart ? 'Takes effect after qBittorrent restarts' : ''].filter(Boolean).join(' · ') || undefined);
  const edit = (value: unknown, debounce = false) => model.edit(def, value, { debounce });
  const lister = (files: boolean) => (dir: string) => app.adding.appApi.directoryContent(dir, files ? 'all' : 'dirs');
  const plural = (n: number, word: string) => `${n} ${n === 1 ? word : /(s|x|sh|ch)$/.test(word) ? `${word}es` : `${word}s`}`;

  function openList(items: string[], itemLabel: string) {
    app.dialogs.open(TextListDialog, {
      title: def.label,
      label: `${plural(2, itemLabel).slice(2).replace(/^./, (c) => c.toUpperCase())}, one per line`,
      value: items.join('\n'),
      allowEmpty: true,
      confirmLabel: 'Save',
      onconfirm: (text: string) => edit(text.split('\n')),
    });
  }
</script>

{#if def.kind === 'switch'}
  <SwitchRow title={def.label} {subtitle} bind:checked={() => ui === true, (on) => edit(on)} />
{:else if def.kind === 'spin'}
  <SpinRow
    title={def.label}
    {subtitle}
    min={def.min ?? 0}
    max={def.max}
    digits={def.digits}
    unit={def.unit}
    bind:value={() => ui as number, (value) => edit(value, true)}
  />
{:else if def.kind === 'limit'}
  <LimitRow
    title={def.label}
    {subtitle}
    value={ui as LimitValue}
    min={def.min}
    max={def.max}
    digits={def.digits}
    unit={def.unit}
    onchange={(value, { debounce }) => edit(value, debounce)}
  />
{:else if def.kind === 'combo'}
  {@const options = def.options}
  <ComboRow
    title={def.label}
    {subtitle}
    options={options.map((option, i) => ({ value: String(i), label: option.label }))}
    bind:value={() => String(options.findIndex((option) => option.value === ui)), (index) => edit(options[Number(index)]!.value)}
  />
{:else if def.kind === 'entry'}
  <EntryRow
    title={def.label}
    type={def.password ? 'password' : 'text'}
    placeholder={def.placeholder}
    bind:value={() => ui as string, (value) => edit(value, true)}
    onblur={() => void model.flush()}
  />
  {#if subtitle}<p class="row-note">{subtitle}</p>{/if}
{:else if def.kind === 'path'}
  <PathEntry title={def.label} placeholder={def.placeholder} list={lister(def.files ?? false)} bind:value={() => ui as string, (value) => edit(value, true)} />
  {#if subtitle}<p class="row-note">{subtitle}</p>{/if}
{:else if def.kind === 'list'}
  {@const items = ui as string[]}
  {@const itemLabel = def.itemLabel}
  <ActionRow
    title={def.label}
    {subtitle}
    value={items.length ? plural(items.length, itemLabel) : 'None'}
    disabled={def.readOnly}
    onclick={() => openList(items, itemLabel)}
  />
{:else if def.kind === 'time'}
  <TimeRow title={def.label} bind:value={() => ui as string, (value) => edit(value)} />
{:else if def.kind === 'subpage'}
  <ActionRow title={def.label} {subtitle} onclick={() => onsubpage?.(def)} />
{:else if def.widget === 'locale'}
  <ComboRow title={def.label} {subtitle} options={localeOptions(String(ui ?? ''))} bind:value={() => String(ui ?? ''), (code) => edit(code)} />
{:else if def.widget === 'categories'}
  <ActionRow title={def.label} {subtitle} value={app.session.categories.size === 1 ? '1 category' : `${app.session.categories.size} categories`} onclick={() => app.openers.manageCategories()} />
{:else if def.widget === 'tags'}
  <ActionRow title={def.label} {subtitle} value={plural(app.session.tags.size, 'tag')} onclick={() => app.openers.manageTags()} />
{:else}
  {@const folders = Object.keys((model.values.scan_dirs ?? {}) as object).length}
  {@const value =
    def.widget === 'apiKey'
      ? maskApiKey(String(ui ?? '')) || 'None'
      : def.widget === 'watchedFolders'
        ? folders
          ? plural(folders, 'folder')
          : 'None'
        : def.widget === 'interface'
          ? String(model.values.current_interface_name || model.values.current_network_interface || 'Any interface')
          : undefined}
  <ActionRow title={def.label} {subtitle} {value} onclick={() => oncustom?.(def)} />
{/if}
