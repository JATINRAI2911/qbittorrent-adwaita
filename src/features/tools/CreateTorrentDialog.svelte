<script lang="ts">
  import type { CreatorTask } from '../../api/creator';
  import { getAppContext } from '../../app-context';
  import { errorText } from '../../commands/mutate';
  import { downloadBlob } from '../../lib/download';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import ComboRow from '../../ui/adw/ComboRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';
  import { DURATION, slide } from '../../ui/adw/motion';
  import ProgressBar from '../../ui/adw/ProgressBar.svelte';
  import SpinRow from '../../ui/adw/SpinRow.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import TextAreaRow from '../../ui/adw/TextAreaRow.svelte';
  import PathEntry from '../paths/PathEntry.svelte';
  import { defaultCreatorForm, isLibtorrent2, MAX_PADDING_KIB, PIECE_SIZES, pieceSizeLabel, taskParams, torrentFileName } from './creator';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();

  let form = $state(defaultCreatorForm());
  /** Null until the server's libtorrent version is known (it decides format vs alignment options). */
  let lt2 = $state<boolean | null>(null);
  let busy = $state(false);
  let tasks = $state.raw<CreatorTask[]>([]);

  const list = (dir: string) => app.adding.appApi.directoryContent(dir, 'all');
  const pieceSizes = PIECE_SIZES.map((size) => ({ value: String(size), label: pieceSizeLabel(size) }));
  const formats = [
    { value: 'hybrid', label: 'Hybrid (v1 + v2)' },
    { value: 'v2', label: 'v2' },
    { value: 'v1', label: 'v1' },
  ] as const;
  const name = (path: string) => torrentFileName(path).replace(/\.torrent$/, '');

  // Tasks are polled every second while any is still waiting or running.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let alive = true;
  async function refresh() {
    clearTimeout(timer);
    try {
      tasks = await app.tools.creator.status();
    } catch {
      // Keep the last list; the next poll retries.
    }
    if (alive && tasks.some((t) => t.status === 'Queued' || t.status === 'Running')) timer = setTimeout(() => void refresh(), 1000);
  }

  $effect(() => {
    void app.adding.appApi
      .buildInfo()
      .then((info) => (lt2 = isLibtorrent2(info.libtorrent)))
      .catch(() => (lt2 = true));
    void refresh();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  });

  async function create() {
    if (lt2 === null) return;
    busy = true;
    try {
      await app.tools.creator.addTask(taskParams(form, lt2));
      app.toasts.show({ title: `Creating “${torrentFileName(form.sourcePath)}”` });
      await refresh();
    } catch (error) {
      app.toasts.show({ title: `Couldn’t create the torrent: ${errorText(error)}` });
    } finally {
      busy = false;
    }
  }

  async function download(task: CreatorTask) {
    try {
      downloadBlob(await app.tools.creator.torrentFile(task.taskID), torrentFileName(task.sourcePath));
    } catch (error) {
      app.toasts.show({ title: `Couldn’t download the torrent: ${errorText(error)}` });
    }
  }

  async function remove(task: CreatorTask) {
    try {
      await app.tools.creator.deleteTask(task.taskID);
    } catch (error) {
      app.toasts.show({ title: `Couldn’t remove the task: ${errorText(error)}` });
    }
    await refresh();
  }
</script>

<Dialog title="Create Torrent" confirmLabel="Create" confirmDisabled={!form.sourcePath.trim() || busy || lt2 === null} width={560} {close} onconfirm={create}>
  <section class="pref-group" aria-label="Source">
    <h4 class="heading">Source</h4>
    <BoxedList>
      <PathEntry title="File or folder" bind:value={form.sourcePath} {list} autofocus />
      <ComboRow title="Piece size" options={pieceSizes} bind:value={() => String(form.pieceSize), (v) => (form.pieceSize = Number(v))} />
      {#if lt2 === true}
        <ComboRow title="Format" options={[...formats]} bind:value={form.format} />
      {:else if lt2 === false}
        <SwitchRow title="Optimize alignment" subtitle="Pad files so pieces start at file boundaries" bind:checked={form.optimizeAlignment} />
        {#if form.optimizeAlignment}
          <SwitchRow title="Only pad files larger than a limit" bind:checked={form.padFiles} />
          {#if form.padFiles}<SpinRow title="Padding limit" unit="KiB" max={MAX_PADDING_KIB} bind:value={form.paddedFileSizeLimitKiB} />{/if}
        {/if}
      {/if}
    </BoxedList>
  </section>

  <section class="pref-group" aria-label="Options">
    <h4 class="heading">Options</h4>
    <BoxedList>
      <SwitchRow title="Private torrent" subtitle="Turns off DHT and Peer Exchange" bind:checked={form.private} />
      <SwitchRow title="Start seeding" subtitle="Add it to qBittorrent once it’s created" bind:checked={form.startSeeding} />
      <EntryRow title="Source" bind:value={form.source} />
    </BoxedList>
    <p class="dialog-note">Some private trackers ask for a source tag.</p>
  </section>

  <section class="pref-group" aria-label="Trackers and Seeds">
    <h4 class="heading">Trackers and Web Seeds</h4>
    <BoxedList>
      <TextAreaRow title="Trackers" hint="One URL per line; a blank line starts a new tier" monospace bind:value={form.trackers} />
      <TextAreaRow title="Web seeds" hint="One URL per line" monospace bind:value={form.urlSeeds} />
      <TextAreaRow title="Comment" bind:value={form.comment} />
    </BoxedList>
  </section>

  {#if tasks.length}
    <section class="pref-group" aria-label="Tasks" transition:slide={{ duration: DURATION.normal }}>
      <h4 class="heading">Tasks</h4>
      <div class="boxed-list" role="list" aria-label="Tasks">
        {#each tasks as task (task.taskID)}
          <div class="row task-row" role="listitem">
            <span class="title-box">
              <span class="title ellipsis">{name(task.sourcePath)}</span>
              {#if task.status === 'Running'}
                <span class="task-progress"><ProgressBar value={(task.progress ?? 0) / 100} /><span class="numeric subtitle">{Math.round(task.progress ?? 0)}%</span></span>
              {:else if task.status === 'Failed'}
                <span class="subtitle error">{task.errorMessage || 'Failed'}</span>
              {:else}
                <span class="subtitle">{task.status === 'Queued' ? 'Waiting' : 'Finished'}</span>
              {/if}
            </span>
            {#if task.status === 'Finished'}
              <button type="button" class="btn text-button" aria-label="Download {torrentFileName(task.sourcePath)}" onclick={() => download(task)}>Download</button>
            {/if}
            <Button icon="trash" variant="flat" title="Remove {name(task.sourcePath)}" onclick={() => remove(task)} />
          </div>
        {/each}
      </div>
    </section>
  {/if}
</Dialog>

<style>
  .pref-group { display: flex; flex-direction: column; gap: 8px; }
  .pref-group h4 { margin: 0 4px; }
  .task-row { gap: 12px; }
  .task-row .title-box { flex: 1; min-width: 0; }
  .task-progress { display: flex; align-items: center; gap: 8px; }
  .task-progress :global(.progressbar) { flex: 1; }
  .subtitle.error { color: var(--error-color); opacity: 1; }
</style>
