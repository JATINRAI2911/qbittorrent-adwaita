<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { getAppContext } from '../../app-context';
  import AlertDialog from '../../ui/adw/AlertDialog.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import { DURATION, fade, rise } from '../../ui/adw/motion';
  import SearchEntry from '../../ui/adw/SearchEntry.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import PreferencesGroup from './PreferencesGroup.svelte';
  import PrefRow from './PrefRow.svelte';
  import SubpageDialog from './SubpageDialog.svelte';
  import { PreferencesModel } from './preferences-model.svelte';
  import { HIDDEN_PAGES, PAGES, PREFERENCES, rowsFor, type PageId, type PrefDef } from './schema';
  import { dangerMessage, webUiUrl } from './danger';
  import { searchPreferences } from './search';

  let { page: initial = 'behavior', close }: { page?: PageId; close: () => void } = $props();
  const app = getAppContext();

  const model = new PreferencesModel({
    api: app.adding.appApi,
    toast: app.toasts,
    confirm: confirmChange,
    onapplied: (def) => {
      if (def.dangerous === 'url') app.toasts.show({ title: `Web UI moved to ${webUiUrl(model.values, location)}` });
    },
  });
  const pages = PAGES.filter((p) => !HIDDEN_PAGES.includes(p.id));
  const pageTitle = (id: PageId) => PAGES.find((p) => p.id === id)!.title;

  let page = $state<PageId>(untrack(() => initial));
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let searching = $state(false);
  let query = $state('');
  let searchInput = $state<HTMLInputElement>();
  let content = $state<HTMLDivElement>();

  const groups = $derived(byGroup(rowsFor(page), (def) => def.group));
  const results = $derived(searching && query.trim() ? searchPreferences(query, PREFERENCES, model.values) : []);
  const resultGroups = $derived(byGroup(results, (r) => `${pageTitle(r.def.page)} › ${r.def.group}`));

  function byGroup<T>(items: T[], key: (item: T) => string): { name: string; items: T[] }[] {
    const out: { name: string; items: T[] }[] = [];
    for (const item of items) {
      const name = key(item);
      const last = out.at(-1);
      if (last?.name === name) last.items.push(item);
      else out.push({ name, items: [item] });
    }
    return out;
  }

  async function load() {
    status = 'loading';
    status = (await model.load()) ? 'ready' : 'error';
  }

  // Edits still waiting on their debounce are sent however the dialog closes (button, Escape,
  // backdrop); the app's cached preferences (save path, port…) are refreshed once afterwards.
  let finished = false;
  async function finish() {
    if (finished) return;
    finished = true;
    await model.flush();
    void app.global.prefs.refresh();
  }

  function closeDialog() {
    void finish();
    close();
  }

  $effect(() => {
    void load();
    return () => void finish();
  });

  // Dangerous changes explain their consequence first; dismissing the alert cancels.
  function confirmChange(def: PrefDef): Promise<boolean> {
    const message = dangerMessage(def, model.values, location);
    return new Promise((resolve) => {
      let answered = false;
      app.dialogs.open(
        AlertDialog,
        {
          heading: message.heading,
          body: message.body,
          responses: [
            { id: 'cancel', label: 'Cancel' },
            { id: 'confirm', label: message.confirmLabel, variant: 'destructive' },
          ],
          onresponse: (id: string) => {
            answered = true;
            resolve(id !== 'cancel');
          },
        },
        () => {
          if (!answered) resolve(false);
        },
      );
    });
  }

  function openSubpage(def: PrefDef) {
    if (def.kind !== 'subpage') return;
    app.dialogs.open(SubpageDialog, { title: def.title, subpage: def.subpage, model, oncustom: openCustom });
  }

  function openCustom(def: PrefDef) {
    void def;
  }

  function choose(id: PageId) {
    void model.flush();
    page = id;
    searching = false;
    query = '';
    content?.scrollTo?.({ top: 0 });
  }

  async function toggleSearch(on = !searching) {
    searching = on;
    if (!on) query = '';
    await tick();
    if (on) searchInput?.focus();
  }

  function onkeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      void toggleSearch(true);
    } else if (event.key === 'Escape' && searching) {
      event.preventDefault();
      event.stopPropagation();
      void toggleSearch(false);
    }
  }

  // Search hits are highlighted with the CSS Custom Highlight API, leaving the rows' markup alone.
  $effect(() => {
    void results;
    const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const registry = typeof CSS !== 'undefined' && 'highlights' in CSS ? CSS.highlights : null;
    if (!registry || !content || !words.length) {
      registry?.delete('pref-search');
      return;
    }
    void tick().then(() => {
      const ranges: Range[] = [];
      for (const title of content!.querySelectorAll('.title, .er-title')) {
        const node = title.firstChild;
        if (!(node instanceof Text)) continue;
        const text = node.data.toLocaleLowerCase();
        for (const word of words) {
          for (let at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + word.length)) {
            const range = new Range();
            range.setStart(node, at);
            range.setEnd(node, at + word.length);
            ranges.push(range);
          }
        }
      }
      registry.set('pref-search', new Highlight(...ranges));
    });
    return () => registry.delete('pref-search');
  });
</script>

<!-- AdwPreferencesDialog: a sidebar of pages with a search toggle, and the selected page. -->
<div
  class="dialog prefs-dialog"
  role="dialog"
  aria-modal="true"
  aria-label="Preferences"
  tabindex="-1"
  in:rise={{ duration: DURATION.slow, scale: 0.96 }}
  out:rise={{ duration: DURATION.fast, scale: 0.96 }}
  {onkeydown}
>
  <aside class="pd-side">
    <header class="headerbar flat">
      <div class="hb-start"></div>
      <div class="hb-title"><span class="title">Preferences</span></div>
      <div class="hb-end">
        <button type="button" class="btn image-button" class:checked={searching} aria-label="Search Preferences" title="Search (Ctrl+F)" aria-pressed={searching} onclick={() => toggleSearch()}>
          <Icon name="search" />
        </button>
      </div>
    </header>
    <nav class="pd-pages" aria-label="Pages">
      {#each pages as p (p.id)}
        <button type="button" class="pd-page" class:active={!searching && page === p.id} aria-current={!searching && page === p.id ? 'page' : undefined} onclick={() => choose(p.id)}>
          <Icon name={p.icon} /><span>{p.title}</span>
        </button>
      {/each}
    </nav>
  </aside>

  <section class="pd-main">
    <header class="headerbar flat">
      <div class="hb-start"></div>
      <div class="hb-title"><span class="title">{searching ? 'Search' : pageTitle(page)}</span></div>
      <div class="hb-end">
        <button type="button" class="btn image-button circular close-button" aria-label="Close" onclick={closeDialog}><Icon name="close" /></button>
      </div>
    </header>
    <div class="pd-content" bind:this={content}>
      {#if searching}
        <div class="pd-search"><SearchEntry label="Search preferences" placeholder="Search preferences" bind:value={query} bind:input={searchInput} /></div>
      {/if}
      {#if status === 'loading'}
        <div class="pd-center"><Spinner size={32} label="Loading preferences" /></div>
      {:else if status === 'error'}
        <StatusPage compact icon="warning" title="Couldn’t Load Preferences" description={model.error ?? ''}>
          <Button label="Try Again" onclick={() => void load()} />
        </StatusPage>
      {:else if searching}
        {#if !query.trim()}
          <p class="pd-hint">Search every page by name, description or key.</p>
        {:else if resultGroups.length === 0}
          <StatusPage compact icon="search" title="No Results" description="Try a different search." />
        {:else}
          {#each resultGroups as group (group.name)}
            <section class="pref-group" aria-label={group.name} in:fade={{ duration: DURATION.fast }}>
              <h4 class="heading">{group.name}</h4>
              <div class="boxed-list">
                {#each group.items as result (result.def.key)}
                  <div class="pref-slot" class:dimmed-row={result.dimmed}>
                    <PrefRow def={result.def} {model} onsubpage={openSubpage} oncustom={openCustom} />
                    {#if result.dimmed && result.def.needs}<p class="row-note">Needs “{result.def.needs}”</p>{/if}
                  </div>
                {/each}
              </div>
            </section>
          {/each}
        {/if}
      {:else}
        {#key page}
          <div class="pd-page-body" in:fade={{ duration: DURATION.normal }}>
            {#each groups as group (group.name)}
              <PreferencesGroup title={group.name} defs={group.items} {model} onsubpage={openSubpage} oncustom={openCustom} />
            {/each}
          </div>
        {/key}
      {/if}
    </div>
  </section>
</div>

<style>
  .prefs-dialog { width: min(920px, 100%); height: min(660px, calc(100vh - 48px)); display: grid; grid-template-columns: 240px 1fr; overflow: hidden; }
  .pd-side { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--border-color); background: color-mix(in srgb, currentColor 3%, transparent); }
  .pd-pages { display: flex; flex-direction: column; gap: 2px; padding: 0 6px 6px; overflow: auto; }
  .pd-page { display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 0 12px; border: 0; border-radius: 8px; background: none; font: inherit; color: inherit; text-align: left; }
  .pd-page:hover { background: var(--hover-color); }
  .pd-page.active { background: var(--selected-color); font-weight: 700; }
  .pd-page:focus-visible { outline: 2px solid var(--focus-ring-color); outline-offset: -2px; }
  .pd-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .pd-content { flex: 1; min-height: 0; overflow: auto; padding: 6px 24px 24px; display: flex; flex-direction: column; gap: 24px; }
  .pd-page-body { display: flex; flex-direction: column; gap: 24px; max-width: 640px; width: 100%; margin: 0 auto; }
  .pd-search { position: sticky; top: 0; z-index: 1; max-width: 640px; width: 100%; margin: 0 auto; padding-bottom: 6px; background: var(--window-bg-color); }
  .pd-center { display: grid; place-items: center; flex: 1; }
  .pd-hint { margin: 24px auto; opacity: var(--dim-opacity); }
  .pd-content > .pref-group { max-width: 640px; width: 100%; margin: 0 auto; }
  .pref-group { display: flex; flex-direction: column; gap: 8px; }
  .pref-group h4 { margin: 0 4px; }
  .pref-slot { border-bottom: 1px solid var(--card-shade-color); }
  .pref-slot:last-child { border-bottom: 0; }
  .dimmed-row > :global(:first-child) { opacity: 0.55; }
  .pref-slot :global(.row-note) { margin: -6px 0 0; padding: 0 14px 10px; font-size: smaller; opacity: var(--dim-opacity); }
  @media (max-width: 720px) {
    .prefs-dialog { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .pd-side { border-right: 0; border-bottom: 1px solid var(--border-color); }
    .pd-pages { flex-direction: row; overflow-x: auto; }
    .pd-page { flex: none; }
  }
</style>
