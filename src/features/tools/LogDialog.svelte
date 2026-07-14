<script lang="ts">
  import { tick } from 'svelte';
  import type { LogMessage, PeerLogEntry } from '../../api/log';
  import { getAppContext } from '../../app-context';
  import { copyText } from '../../lib/clipboard';
  import { formatCount } from '../../lib/format';
  import Button from '../../ui/adw/Button.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import { DURATION, rise } from '../../ui/adw/motion';
  import SearchEntry from '../../ui/adw/SearchEntry.svelte';
  import Spinner from '../../ui/adw/Spinner.svelte';
  import ToggleGroup from '../../ui/adw/ToggleGroup.svelte';
  import { maskSecrets } from '../details/trackers';
  import { virtualWindow } from '../table/virtual';
  import { filterMessages, LogModel, words, type LogLevel } from './log-model.svelte';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();

  const visibility = {
    isHidden: () => document.hidden,
    onVisible: (callback: () => void) => {
      const handler = () => {
        if (!document.hidden) callback();
      };
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    },
  };
  const messages = new LogModel<LogMessage>({ fetch: (id) => app.tools.log.main(id), ...visibility });
  const peers = new LogModel<PeerLogEntry>({ fetch: (id) => app.tools.log.peers(id), ...visibility });

  let tab = $state<'main' | 'peers'>('main');
  let level = $state<LogLevel>('all');
  let query = $state('');
  let selected = $state<number | null>(null);

  const model = $derived(tab === 'main' ? messages : peers);
  const shownPeers = $derived.by(() => {
    const needles = words(query);
    return peers.entries.filter((p) => needles.every((n) => `${p.ip} ${p.reason}`.toLocaleLowerCase().includes(n)));
  });
  const shown = $derived<(LogMessage | PeerLogEntry)[]>(tab === 'main' ? filterMessages(messages.entries, level, query) : shownPeers);
  const current = $derived(shown.find((entry) => entry.id === selected) ?? null);

  // Chronological, virtualized; new lines keep the view at the bottom only if it was already there.
  const ROW = 34;
  let scroller = $state<HTMLDivElement>();
  let scrollTop = $state(0);
  let viewport = $state(0);
  const win = $derived(virtualWindow({ scrollTop, viewportHeight: viewport, rowHeight: ROW, count: shown.length }));
  let pinned = true;

  // Measured like the table view: ResizeObserver where there is one, a sane default otherwise.
  $effect(() => {
    if (!scroller) return;
    const el = scroller;
    const measure = () => (viewport = el.clientHeight || 400);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => observer?.disconnect();
  });

  $effect.pre(() => {
    void shown.length;
    if (scroller) pinned = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - ROW;
  });
  $effect(() => {
    void shown.length;
    if (pinned && scroller) void tick().then(() => scroller && (scroller.scrollTop = scroller.scrollHeight));
  });

  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let root = $state<HTMLDivElement>();
  $effect(() => {
    messages.start();
    peers.start();
    void tick().then(() => root?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus());
    return () => {
      messages.stop();
      peers.stop();
      opener?.focus();
    };
  });

  const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  function time(seconds: number): string {
    const date = new Date(seconds * 1000);
    const today = new Date().toDateString() === date.toDateString();
    return today ? clock.format(date) : `${day.format(date)} ${clock.format(date)}`;
  }

  const LEVEL_CLASS: Record<number, string> = { 4: 'warning', 8: 'critical' };
  const isMessage = (entry: LogMessage | PeerLogEntry): entry is LogMessage => 'message' in entry;
  const text = (entry: LogMessage | PeerLogEntry) => (isMessage(entry) ? entry.message : `${entry.ip} ${entry.blocked ? 'blocked' : 'banned'}: ${entry.reason}`);

  async function copy() {
    if (!current) return;
    await copyText(text(current));
    app.toasts.show({ title: 'Copied' });
  }

  function onkeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && current && !window.getSelection()?.toString()) {
      event.preventDefault();
      void copy();
    }
  }
</script>

<div
  class="dialog log-dialog"
  role="dialog"
  aria-modal="true"
  aria-label="Execution Log"
  tabindex="-1"
  bind:this={root}
  in:rise={{ duration: DURATION.slow, scale: 0.96 }}
  out:rise={{ duration: DURATION.fast, scale: 0.96 }}
  {onkeydown}
>
  <header class="headerbar flat">
    <div class="hb-start">
      <ToggleGroup label="Log" options={[{ value: 'main', label: 'Messages' }, { value: 'peers', label: 'Peers' }]} value={tab} onchange={(next) => ((tab = next), (selected = null))} />
    </div>
    <div class="hb-title"><span class="title">Execution Log</span></div>
    <div class="hb-end"><button type="button" class="btn image-button circular close-button" aria-label="Close" onclick={close}><Icon name="close" /></button></div>
  </header>

  <div class="log-toolbar">
    {#if tab === 'main'}
      <ToggleGroup
        label="Level"
        options={[{ value: 'all', label: 'All' }, { value: 'info', label: 'Info' }, { value: 'warning', label: 'Warnings' }, { value: 'critical', label: 'Critical' }]}
        value={level}
        onchange={(next) => (level = next)}
      />
    {/if}
    <span class="spacer"></span>
    <span class="dimmed numeric log-count">{formatCount(shown.length)} of {formatCount(model.entries.length)}</span>
    <div class="log-search"><SearchEntry label="Search the log" placeholder="Search" bind:value={query} /></div>
  </div>

  <div class="log-body" bind:this={scroller} onscroll={(event) => (scrollTop = event.currentTarget.scrollTop)}>
    {#if model.loading}
      <div class="log-center"><Spinner size={24} label="Loading the log" /></div>
    {:else if model.error && !model.entries.length}
      <div class="log-center"><p class="error">Couldn’t read the log: {model.error}</p></div>
    {:else}
      <ul class="log-list" role="list" aria-label={tab === 'main' ? 'Messages' : 'Peers'} style:height="{win.total}px">
        {#each shown.slice(win.start, win.end) as entry, i (entry.id)}
          <li
            class="log-row {isMessage(entry) ? (LEVEL_CLASS[entry.type] ?? '') : ''}"
            class:selected={entry.id === selected}
            style:top="{(win.start + i) * ROW}px"
            role="listitem"
          >
            <button type="button" class="log-row-button" onclick={() => (selected = entry.id)}>
              <span class="log-time numeric">{time(entry.timestamp)}</span>
              {#if isMessage(entry)}
                <span class="log-text monospace">{maskSecrets(entry.message)}</span>
              {:else}
                <span class="log-ip monospace">{entry.ip}</span>
                <span class="log-pill" class:blocked={entry.blocked}>{entry.blocked ? 'Blocked' : 'Banned'}</span>
                <span class="log-text">{entry.reason}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if current}
    <section class="log-detail" aria-label="Selected message">
      <p class="log-detail-text monospace">{maskSecrets(text(current))}</p>
      <Button label="Copy" onclick={copy} />
    </section>
  {/if}
</div>

<style>
  .log-dialog { width: min(760px, 100%); height: min(560px, calc(100vh - 48px)); display: flex; flex-direction: column; overflow: hidden; }
  .log-toolbar { display: flex; align-items: center; gap: 12px; padding: 0 12px 8px; }
  .spacer { flex: 1; }
  .log-search { width: 220px; }
  .log-count { font-size: smaller; white-space: nowrap; }
  .log-body { flex: 1; min-height: 0; overflow: auto; margin: 0 12px; border-radius: 12px; background: var(--card-bg-color); box-shadow: 0 0 0 1px rgb(0 0 6 / 3%), 0 1px 3px 1px rgb(0 0 6 / 7%); }
  .log-center { display: grid; place-items: center; height: 100%; }
  .log-list { position: relative; margin: 0; padding: 0; list-style: none; }
  .log-row { position: absolute; left: 0; right: 0; height: 34px; }
  .log-row-button { display: flex; align-items: center; gap: 12px; width: 100%; height: 100%; padding: 0 12px; border: 0; background: none; font: inherit; color: inherit; text-align: left; }
  .log-row-button:hover { background: var(--hover-color); }
  .log-row.selected .log-row-button { background: var(--selected-color); }
  .log-row-button:focus-visible { outline: 2px solid var(--focus-ring-color); outline-offset: -2px; }
  /* The time stays neutral: warning rows colour only the message, and dimmed warning text drops below AA. */
  .log-time { flex: none; color: var(--window-fg-color); opacity: var(--dim-opacity); font-size: smaller; }
  .log-text, .log-ip { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--monospace-font-size); }
  .log-text { flex: 1; }
  /* A fixed column so the status pills line up (IPv6 addresses vary a lot in length). */
  .log-ip { flex: none; width: 27ch; }
  .log-row.warning .log-text { color: var(--warning-color); }
  .log-row.critical .log-text { color: var(--error-color); }
  .log-pill { flex: none; padding: 1px 8px; border-radius: 99px; font-size: smaller; font-weight: 700; background: color-mix(in srgb, var(--error-color) 18%, transparent); color: var(--error-color); }
  .log-pill.blocked { background: color-mix(in srgb, var(--warning-color) 18%, transparent); color: var(--warning-color); }
  .log-detail { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px 12px; }
  .log-detail-text { flex: 1; margin: 0; max-height: 6.5em; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: var(--monospace-font-size); }
</style>
