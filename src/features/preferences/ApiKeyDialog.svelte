<script lang="ts">
  import { getAppContext } from '../../app-context';
  import { copyText } from '../../lib/clipboard';
  import AlertDialog from '../../ui/adw/AlertDialog.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import type { PreferencesModel } from './preferences-model.svelte';
  import { maskApiKey } from './values';

  let { model, close }: { model: PreferencesModel; close: () => void } = $props();
  const app = getAppContext();

  const key = $derived(String(model.values.web_ui_api_key ?? ''));
  /** A key just created: shown in full this once, like qBittorrent's own dialog. */
  let fresh = $state<string | null>(null);
  let busy = $state(false);

  function confirm(heading: string, body: string, label: string, run: () => Promise<void>) {
    app.dialogs.open(AlertDialog, {
      heading,
      body,
      responses: [
        { id: 'cancel', label: 'Cancel' },
        { id: 'confirm', label, variant: 'destructive' },
      ],
      onresponse: (id: string) => {
        if (id === 'confirm') void run();
      },
    });
  }

  async function act(run: () => Promise<string | void>, failure: string) {
    busy = true;
    try {
      const created = await run();
      fresh = typeof created === 'string' ? created : null;
      await model.load();
    } catch (error) {
      app.toasts.show({ title: `${failure}: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      busy = false;
    }
  }

  const rotate = () =>
    confirm(
      key ? 'Replace the API Key?' : 'Create an API Key?',
      key ? 'Scripts and apps using the current key stop working until you give them the new one.' : 'Scripts and apps can use it instead of your password.',
      key ? 'Replace' : 'Create',
      () => act(() => app.adding.appApi.rotateAPIKey(), 'Couldn’t create the key'),
    );

  const remove = () =>
    confirm('Delete the API Key?', 'Scripts and apps using it stop working.', 'Delete', () => act(() => app.adding.appApi.deleteAPIKey(), 'Couldn’t delete the key'));

  async function copy() {
    if (!fresh) return;
    await copyText(fresh);
    app.toasts.show({ title: 'Copied the API key' });
  }
</script>

<Dialog title="API Key" width={480} {close}>
  <div class="boxed-list">
    <div class="row">
      <span class="title-box">
        <span class="subtitle">Key</span>
        <span class="title monospace api-key">{fresh ?? (key ? maskApiKey(key) : 'No API key')}</span>
      </span>
      {#if fresh}<Button icon="copy" title="Copy the API key" onclick={copy} />{/if}
    </div>
  </div>
  {#if fresh}<p class="dialog-note">Copy it now; afterwards it’s shown masked.</p>{/if}
  <div class="api-actions">
    <Button label={key ? 'Rotate' : 'Create'} disabled={busy} onclick={rotate} />
    {#if key}<Button label="Delete" variant="destructive" disabled={busy} onclick={remove} />{/if}
  </div>
</Dialog>

<style>
  .api-key { word-break: break-all; white-space: normal; }
  .api-actions { display: flex; gap: 12px; justify-content: center; }
</style>
