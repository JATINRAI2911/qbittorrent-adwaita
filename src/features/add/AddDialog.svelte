<script lang="ts">
  import { DURATION, slide } from '../../ui/adw/motion';
  import { untrack } from 'svelte';
  import type { TorrentFile } from '../../api/details';
  import { getAppContext } from '../../app-context';
  import { formatBytes, formatCount } from '../../lib/format';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import CheckButton from '../../ui/adw/CheckButton.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';
  import ExpanderRow from '../../ui/adw/ExpanderRow.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import SpinRow from '../../ui/adw/SpinRow.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import { fileRows } from '../details/files';
  import PathEntry from '../paths/PathEntry.svelte';
  import { AddModel, defaultsFromPreferences, type AddForm, type AddItem } from './add-model.svelte';
  import { buildAddPlan } from './plan';
  import TagPicker from './TagPicker.svelte';

  let { text = '', files = [], close }: { text?: string; files?: File[]; close: () => void } = $props();

  const app = getAppContext();
  const model = new AddModel({ api: app.adding.api, has: (hash) => app.session.torrents.has(hash) });
  let draft = $state('');
  let defaultSavePath = $state('');
  const list = (dir: string) => app.adding.appApi.directoryContent(dir);

  untrack(() => {
    if (text) model.addText(text);
    if (files.length) model.addFiles(files);
  });

  $effect(() => {
    void app.adding.appApi
      .preferences()
      .then((prefs) => {
        const defaults = defaultsFromPreferences(prefs);
        defaultSavePath = defaults.savePath ?? '';
        model.applyDefaults(defaults);
      })
      .catch(() => {});
    return () => model.dispose();
  });

  const categories = $derived([...app.session.categories.values()].sort((a, b) => a.name.localeCompare(b.name)));
  const categoryOptions = $derived([{ value: '', label: 'None' }, ...categories.map((c) => ({ value: c.name, label: c.name }))]);
  const autoPath = $derived.by(() => {
    const category = app.session.categories.get(model.form.category);
    if (category?.savePath) return category.savePath;
    const base = defaultSavePath || model.form.savePath;
    return model.form.category ? `${base.replace(/\/+$/, '')}/${model.form.category}` : base;
  });

  const single = $derived(model.single);
  const previewFiles = $derived<TorrentFile[]>(
    model.canSelectFiles
      ? single!.metadata!.info.files.map((f, index) => ({ index, name: f.path, size: f.length, progress: 0, priority: model.skipped.has(index) ? 0 : 1, piece_range: [0, 0], availability: 0 }))
      : [],
  );
  const rows = $derived(previewFiles.length ? fileRows(previewFiles, { collapsed: new Set(), query: '' }) : []);
  const selectedBytes = $derived(previewFiles.filter((f) => f.priority !== 0).reduce((s, f) => s + f.size, 0));
  const totalBytes = $derived(previewFiles.reduce((s, f) => s + f.size, 0));
  const queueing = $derived(app.session.server.queueing ?? false);

  function edit<K extends keyof AddForm>(key: K, value: AddForm[K]) {
    model.form[key] = value;
    model.markEdited(key);
  }

  function takeDraft() {
    if (draft.trim()) {
      model.addText(draft);
      draft = '';
    }
  }

  function status(item: AddItem): string {
    switch (item.status) {
      case 'loading':
      case 'waiting':
        return item.kind === 'file' ? 'Reading…' : 'Fetching metadata…';
      case 'duplicate':
        return 'Already added';
      case 'error':
        return item.error ?? 'Couldn’t read metadata';
      case 'ready':
        return item.metadata ? `${formatBytes(item.metadata.info.length)} · ${formatCount(item.metadata.info.files.length)} ${item.metadata.info.files.length === 1 ? 'file' : 'files'}` : '';
    }
  }

  function add() {
    const plan = buildAddPlan(model.items, model.form, model.skipped);
    // Names only: a URL's label is a masked link, which never goes in a toast.
    void app.adding.commands.add(plan, model.addable.map((item) => (item.metadata || item.kind === 'magnet' ? item.label : null)));
    close();
  }
</script>

<Dialog title="Add Torrents" confirmLabel="Add" confirmDisabled={model.addable.length === 0} width={600} {close} onconfirm={add}>
  <section class="add-section" aria-label="Sources">
    <div class="source-box">
      <label class="heading" for="add-source">Magnet links or URLs</label>
      <textarea
        id="add-source"
        rows="3"
        spellcheck="false"
        placeholder="Paste magnet links or .torrent URLs"
        bind:value={draft}
        onpaste={() => setTimeout(takeDraft)}
        onblur={takeDraft}
        onkeydown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            takeDraft();
          }
        }}
      ></textarea>
      <div class="source-actions">
        <label class="btn open-files">
          <Icon name="file" /><span>Open Files…</span>
          <input type="file" accept=".torrent,application/x-bittorrent" multiple aria-label="Torrent files" hidden onchange={(event) => {
            model.addFiles([...(event.currentTarget.files ?? [])]);
            event.currentTarget.value = '';
          }} />
        </label>
      </div>
      {#if model.invalid.length}<p class="dialog-note error">{formatCount(model.invalid.length)} {model.invalid.length === 1 ? 'item isn’t' : 'items aren’t'} a magnet link or URL.</p>{/if}
    </div>

    {#if model.items.length}
      <div class="boxed-list" role="list" aria-label="Torrents to add">
        {#each model.items as item (item.id)}
          <div class="row add-item" role="listitem" class:dim={item.status === 'duplicate'} transition:slide={{ duration: DURATION.normal }}>
            {#if item.status === 'loading' || item.status === 'waiting'}<Spinner size={16} />{:else if item.status === 'duplicate' || item.status === 'error'}<Icon name="warning" class="warn" />{:else}<Icon name={item.kind === 'file' ? 'file' : 'magnet'} class="dimmed" />{/if}
            <span class="title-box"><span class="title ellipsis" dir="auto">{item.label}</span><span class="subtitle" class:error={item.status === 'error'}>{status(item)}</span></span>
            <Button variant="flat" icon="close" title="Remove {item.label}" onclick={() => model.remove(item.id)} />
          </div>
        {/each}
      </div>
    {/if}
  </section>

  {#if rows.length}
    <section class="add-section" aria-label="Files">
      <div class="pg-header"><div><h4 class="heading">Files</h4><p class="pg-desc numeric">{formatBytes(selectedBytes)} of {formatBytes(totalBytes)} selected</p></div></div>
      <div class="boxed-list add-files">
        {#each rows as node (node.path)}
          <div class="row file-row" style:--depth={node.depth}>
            <CheckButton checked={node.check} label="Download {node.name}" onclick={() => model.setSkipped(node.ids, node.check === true)} />
            <Icon name={node.kind === 'folder' ? 'folder' : 'file'} class="dimmed" />
            <span class="title ellipsis" dir="auto">{node.name}</span>
            <span class="dimmed numeric">{formatBytes(node.size)}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <section class="add-section" aria-label="Destination">
    <BoxedList>
      <ComboRow title="Category" options={categoryOptions} bind:value={() => model.form.category, (v) => edit('category', v)} />
      <SwitchRow title="Automatic management" subtitle="Save path follows the category" bind:checked={() => model.form.autoTMM, (v) => edit('autoTMM', v)} />
      {#if model.form.autoTMM}
        <div class="row"><span class="title-box"><span class="subtitle">Save path</span><span class="title monospace">{autoPath}</span></span></div>
      {:else}
        <PathEntry title="Save path" bind:value={() => model.form.savePath, (v) => edit('savePath', v)} {list} />
      {/if}
      <TagPicker tags={[...app.session.tags]} bind:selected={() => model.form.tags, (v) => edit('tags', v)} />
      <SwitchRow title="Start downloading" bind:checked={() => model.form.start, (v) => edit('start', v)} />
    </BoxedList>
  </section>

  <section class="add-section" aria-label="Advanced options">
    <div class="boxed-list">
      <ExpanderRow title="Advanced" subtitle="Layout, checking, limits and more">
        <ComboRow
          title="Content layout"
          options={[{ value: 'Original', label: 'Original' }, { value: 'Subfolder', label: 'Create subfolder' }, { value: 'NoSubfolder', label: 'Don’t create subfolder' }]}
          bind:value={() => model.form.contentLayout, (v) => edit('contentLayout', v)}
        />
        <ComboRow
          title="Stop when"
          options={[{ value: 'None', label: 'Never' }, { value: 'MetadataReceived', label: 'Metadata received' }, { value: 'FilesChecked', label: 'Files checked' }]}
          bind:value={() => model.form.stopCondition, (v) => edit('stopCondition', v)}
        />
        <SwitchRow title="Skip hash check" bind:checked={() => model.form.skipChecking, (v) => edit('skipChecking', v)} />
        <SwitchRow title="Sequential download" bind:checked={() => model.form.sequential, (v) => edit('sequential', v)} />
        <SwitchRow title="First and last pieces first" bind:checked={() => model.form.firstLast, (v) => edit('firstLast', v)} />
        {#if queueing}<SwitchRow title="Add to top of queue" bind:checked={() => model.form.addToTop, (v) => edit('addToTop', v)} />{/if}
        {#if single}<EntryRow title="Rename" bind:value={() => model.form.rename, (v) => edit('rename', v)} />{/if}
        <SpinRow title="Download limit" subtitle="0 means unlimited" unit="KiB/s" bind:value={() => model.form.dlLimitKiB, (v) => edit('dlLimitKiB', v)} />
        <SpinRow title="Upload limit" subtitle="0 means unlimited" unit="KiB/s" bind:value={() => model.form.upLimitKiB, (v) => edit('upLimitKiB', v)} />
        {#if !model.form.autoTMM}
          <SwitchRow title="Use an incomplete folder" bind:checked={() => model.form.useDownloadPath, (v) => edit('useDownloadPath', v)} />
          {#if model.form.useDownloadPath}<PathEntry title="Incomplete folder" bind:value={() => model.form.downloadPath, (v) => edit('downloadPath', v)} {list} />{/if}
        {/if}
      </ExpanderRow>
    </div>
  </section>
</Dialog>

<style>
  .add-section { display: flex; flex-direction: column; gap: 12px; }
  .source-box { display: flex; flex-direction: column; gap: 8px; }
  .source-box label.heading { margin: 0 4px; }
  textarea {
    resize: vertical; min-height: 72px; padding: 10px 12px; border: 0; border-radius: 12px; font: inherit;
    font-family: var(--monospace-font-family); font-size: var(--monospace-font-size); background: var(--card-bg-color); color: inherit;
    box-shadow: 0 0 0 1px rgb(0 0 6 / 3%), 0 1px 3px 1px rgb(0 0 6 / 7%);
  }
  textarea:focus { outline: 2px solid var(--focus-ring-color); outline-offset: -2px; }
  .source-actions { display: flex; justify-content: flex-end; }
  .open-files { gap: 6px; cursor: default; }
  .add-item { gap: 12px; }
  .add-item.dim .title { opacity: var(--dim-opacity); }
  .add-item :global(.warn) { color: var(--warning-color); }
  .add-item .title-box { min-width: 0; }
  .add-files { max-height: 260px; overflow: auto; }
  .file-row { padding-left: calc(14px + var(--depth) * 24px); gap: 10px; min-height: 44px; }
  .file-row .title { flex: 1; min-width: 0; }
  .subtitle.error { color: var(--error-color); opacity: 1; }
</style>
