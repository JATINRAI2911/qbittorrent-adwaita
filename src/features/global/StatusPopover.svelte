<script lang="ts">
  import type { ServerState } from '../../api/types';
  import { getAppContext } from '../../app-context';
  import { formatBytes, formatCount, formatSpeed } from '../../lib/format';
  import type { Health } from '../../state/health';
  import type { SpeedSample } from '../../state/speed-history.svelte';
  import Button from '../../ui/adw/Button.svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import SwitchRow from '../../ui/adw/SwitchRow.svelte';
  import SpeedGraph from './SpeedGraph.svelte';

  let { health, close }: { health: () => Health; close: () => void } = $props();
  const app = getAppContext();

  interface View {
    health: Health;
    server: Partial<ServerState>;
    samples: readonly SpeedSample[];
  }
  // Live while open, but still while the pointer is over it, so figures don't move under the cursor.
  let frozen = $state.raw<View | null>(null);
  const view = $derived<View>(frozen ?? { health: health(), server: app.session.server, samples: app.session.speeds.samples });
  const s = $derived(view.server);
  const alt = $derived(app.session.server.use_alt_speed_limits ?? false);
  const free = $derived(typeof s.free_space_on_disk === 'number' && s.free_space_on_disk >= 0 ? formatBytes(s.free_space_on_disk) : 'Unknown');
  const ICON = { ok: 'network', warning: 'warning', error: 'exclamation' } as const;

  const limit = (bytes: number | undefined) => (bytes ? `Limit ${formatSpeed(bytes)}` : 'No limit');

  function freeze() {
    frozen = { health: health(), server: { ...app.session.server }, samples: app.session.speeds.samples };
  }

  function open(which: 'speedLimits' | 'statistics') {
    close();
    app.openers[which]();
  }
</script>

<div class="status-popover" role="group" aria-label="Status" onpointerenter={freeze} onpointerleave={() => (frozen = null)}>
  <p class="health tone-{view.health.level}"><Icon name={ICON[view.health.level]} /><span>{view.health.line}</span></p>

  <div class="speeds">
    <div class="speed">
      <span class="caption dimmed">Download</span>
      <span class="title-3 numeric">↓ {formatSpeed(s.dl_info_speed ?? 0)}</span>
      <span class="caption dimmed">{limit(s.dl_rate_limit)}</span>
    </div>
    <div class="speed">
      <span class="caption dimmed">Upload</span>
      <span class="title-3 numeric">↑ {formatSpeed(s.up_info_speed ?? 0)}</span>
      <span class="caption dimmed">{limit(s.up_rate_limit)}</span>
    </div>
  </div>

  <SpeedGraph samples={view.samples} />

  <div class="boxed-list">
    <SwitchRow
      title="Alternative speed limits"
      disabled={app.session.connection === 'offline'}
      bind:checked={() => alt, (on) => void app.global.commands.setAltSpeed(on)}
    />
    <div class="row"><span class="title">Free space</span><span class="dimmed numeric">{free}</span></div>
    <div class="row"><span class="title">DHT nodes</span><span class="dimmed numeric">{formatCount(s.dht_nodes ?? 0)}</span></div>
    <div class="row">
      <span class="title">This session</span>
      <span class="dimmed numeric">↓ {formatBytes(s.dl_info_data ?? 0)} · ↑ {formatBytes(s.up_info_data ?? 0)}</span>
    </div>
  </div>

  <div class="popover-footer">
    <Button label="Speed Limits…" onclick={() => open('speedLimits')} />
    <Button label="Statistics…" onclick={() => open('statistics')} />
  </div>
</div>

<style>
  .status-popover { display: flex; flex-direction: column; gap: 12px; width: 320px; padding: 6px; }
  .health { display: flex; align-items: center; gap: 8px; margin: 0; font-weight: 700; }
  .health.tone-warning { color: var(--warning-color); }
  .health.tone-error { color: var(--error-color); }
  .speeds { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .speed { display: flex; flex-direction: column; gap: 2px; }
  .popover-footer { display: flex; gap: 6px; }
  .popover-footer :global(.btn) { flex: 1; }
</style>
