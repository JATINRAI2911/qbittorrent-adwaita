<script lang="ts">
  import type { Cookie } from '../../api/app';
  import { getAppContext } from '../../app-context';
  import { errorText } from '../../commands/mutate';
  import Button from '../../ui/adw/Button.svelte';
  import DateRow from '../../ui/adw/DateRow.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';
  import { DURATION, slide } from '../../ui/adw/motion';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import StatusPage from '../../ui/adw/StatusPage.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import { cookieProblems, fromDraft, toDraft, type CookieDraft } from './cookies';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();

  // Cookies qBittorrent sends when downloading .torrent files and RSS feeds (private-tracker logins).
  // Values are secrets: hidden unless revealed, never in toasts or titles.
  let drafts = $state<CookieDraft[]>([]);
  let original = $state.raw<Cookie[]>([]);
  let revealed = $state<Record<number, boolean>>({});
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let loadError = $state('');
  let saving = $state(false);
  let nextId = 0;

  const problems = $derived(cookieProblems(drafts));
  const changed = $derived(JSON.stringify(drafts.map(fromDraft)) !== JSON.stringify(original));

  async function load() {
    status = 'loading';
    try {
      original = await app.adding.appApi.cookies();
      drafts = original.map((cookie) => toDraft(cookie, ++nextId));
      status = 'ready';
    } catch (error) {
      loadError = errorText(error);
      status = 'error';
    }
  }

  $effect(() => {
    void load();
  });

  function add() {
    drafts.push({ ...toDraft({ name: '', domain: '', path: '/', value: '', expirationDate: 0 }, ++nextId) });
  }

  async function save() {
    saving = true;
    try {
      await app.adding.appApi.setCookies(drafts.map(fromDraft));
      app.toasts.show({ title: 'Saved cookies' });
      close();
    } catch (error) {
      app.toasts.show({ title: `Couldn’t save the cookies: ${errorText(error)}` });
    } finally {
      saving = false;
    }
  }
</script>

<Dialog title="Cookies" confirmLabel="Save" confirmDisabled={status !== 'ready' || !changed || saving || Object.keys(problems).length > 0} width={560} {close} onconfirm={save}>
  {#if status === 'loading'}
    <div class="cookies-center"><Spinner size={24} label="Loading cookies" /></div>
  {:else if status === 'error'}
    <StatusPage compact icon="warning" title="Couldn’t Load Cookies" description={loadError}>
      <Button label="Try Again" onclick={() => void load()} />
    </StatusPage>
  {:else}
    <p class="dialog-note cookies-note">qBittorrent sends these when it downloads .torrent files, for example to stay logged in to a private tracker.</p>
    {#each drafts as draft (draft.id)}
      <div class="boxed-list" role="group" aria-label="Cookie {draft.domain} {draft.name}" transition:slide={{ duration: DURATION.normal }}>
        <div class="row cookie-head">
          <span class="title ellipsis">{draft.domain || draft.name ? `${draft.domain || 'no domain'} · ${draft.name || 'no name'}` : 'New cookie'}</span>
          <Button icon="trash" variant="flat" title="Remove {draft.name || 'this cookie'}" onclick={() => (drafts = drafts.filter((d) => d.id !== draft.id))} />
        </div>
        <EntryRow title="Domain" bind:value={draft.domain} />
        <EntryRow title="Path" bind:value={draft.path} />
        <EntryRow title="Name" bind:value={draft.name} />
        <EntryRow title="Value" type={revealed[draft.id] ? 'text' : 'password'} autocomplete="off" bind:value={draft.value} />
        <SwitchRow title="Show value" bind:checked={() => revealed[draft.id] ?? false, (on) => (revealed[draft.id] = on)} />
        <SwitchRow title="Expires" subtitle={draft.expires ? undefined : 'Kept until qBittorrent quits'} bind:checked={draft.expires} />
        {#if draft.expires}<DateRow title="Expires on" bind:value={draft.date} />{/if}
        {#if problems[draft.id]}<p class="row-note error">{problems[draft.id]}</p>{/if}
      </div>
    {/each}
    {#if !drafts.length}<p class="cookies-empty">No cookies.</p>{/if}
    <div class="cookies-add"><Button label="Add Cookie" onclick={add} /></div>
  {/if}
</Dialog>

<style>
  .cookies-center { display: grid; place-items: center; min-height: 160px; }
  .cookies-note { margin: 0 4px; }
  .cookie-head { gap: 12px; font-weight: 700; }
  .cookie-head .title { flex: 1; min-width: 0; }
  .row-note.error { margin: 0; padding: 8px 14px 10px; font-size: smaller; color: var(--error-color); }
  .cookies-empty { margin: 12px auto; opacity: var(--dim-opacity); }
  .cookies-add { display: flex; justify-content: center; }
</style>
