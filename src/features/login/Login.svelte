<script lang="ts">
  import type { LoginOutcome } from '../../state/session.svelte';
  import BoxedList from '../../ui/adw/BoxedList.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import EntryRow from '../../ui/adw/EntryRow.svelte';
  import Icon from '../../ui/adw/Icon.svelte';

  let { onlogin }: { onlogin: (username: string, password: string) => Promise<LoginOutcome> } = $props();

  const MESSAGES: Record<Exclude<LoginOutcome, 'ok'>, string> = {
    invalid: 'Incorrect username or password.',
    banned: 'Too many failed attempts. Your IP address is temporarily banned - try again later.',
    network: 'Can’t reach qBittorrent. Check that it’s running and the Web UI is enabled.',
  };

  let username = $state('');
  let password = $state('');
  let pending = $state(false);
  let error = $state('');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (pending) return;
    // Read from the form so values filled in by the browser's password manager count.
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const user = String(data.get('username') ?? '');
    const pass = String(data.get('password') ?? '');
    pending = true;
    error = '';
    const outcome = await onlogin(user, pass);
    if (outcome === 'ok') return; // stay busy: the overlay disappears once the first sync lands
    pending = false;
    error = MESSAGES[outcome];
    if (outcome === 'invalid') password = '';
  }
</script>

<div class="login-page">
  <form class="login-card" onsubmit={submit}>
    <div class="app-icon"><Icon name="magnet" /></div>
    <h1 class="title-1">qBittorrent</h1>
    <p class="body dimmed">Log in to manage your torrents</p>
    <div class="fields">
      <BoxedList>
        <EntryRow title="Username" name="username" autocomplete="username" autofocus bind:value={username} />
        <EntryRow title="Password" name="password" type="password" autocomplete="current-password" bind:value={password} />
      </BoxedList>
    </div>
    {#if error}<p class="login-error error" role="alert">{error}</p>{/if}
    <Button type="submit" variant="suggested" pill label={pending ? 'Logging In…' : 'Log In'} disabled={pending} />
  </form>
</div>

<style>
  .login-page { min-height: 100%; display: grid; place-items: center; padding: 36px 12px; }
  .login-card { width: min(360px, 100%); display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
  .app-icon {
    width: 96px; height: 96px; margin-bottom: 12px; border-radius: 22px; display: grid; place-items: center; color: #fff;
    background: linear-gradient(180deg, #62a0ea, #1c71d8);
    box-shadow: 0 4px 12px rgb(28 113 216 / 30%), inset 0 -5px rgb(0 0 0 / 12%);
  }
  .app-icon :global(svg.i) { width: 48px; height: 48px; stroke-width: 1.4; }
  .fields { width: 100%; margin-top: 24px; text-align: left; }
  .login-error { font-size: smaller; }
  .login-card :global(.btn) { margin-top: 12px; min-width: 160px; }
</style>
