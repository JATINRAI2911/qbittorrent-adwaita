<script lang="ts">
  import { formatSpeed } from '../../lib/format';
  import { HISTORY_MS, type SpeedSample } from '../../state/speed-history.svelte';

  let { samples }: { samples: readonly SpeedSample[] } = $props();

  const W = 240;
  const H = 64;
  const now = $derived(samples.at(-1)?.t ?? 0);
  const peakDl = $derived(Math.max(0, ...samples.map((s) => s.dl)));
  const peakUl = $derived(Math.max(0, ...samples.map((s) => s.ul)));
  const scale = $derived(Math.max(1, peakDl, peakUl));

  const x = (t: number) => Math.max(0, W - ((now - t) / HISTORY_MS) * W);
  const y = (value: number) => H - 2 - (value / scale) * (H - 4);
  const path = (pick: (s: SpeedSample) => number) =>
    samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)} ${y(pick(s)).toFixed(1)}`).join('');

  const dl = $derived(path((s) => s.dl));
  const ul = $derived(path((s) => s.ul));
  const area = $derived(samples.length > 1 ? `${dl}L${x(now).toFixed(1)} ${H}L${x(samples[0]!.t).toFixed(1)} ${H}Z` : '');
  const label = $derived(
    samples.length ? `Speed over the last minute. Peak download ${formatSpeed(peakDl)}, peak upload ${formatSpeed(peakUl)}.` : 'No speed data yet.',
  );
</script>

<svg class="speed-graph" viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img" aria-label={label}>
  <path class="dl-area" d={area} />
  <path class="dl" d={dl} />
  <path class="ul" d={ul} />
</svg>

<style>
  .speed-graph { display: block; width: 100%; height: 64px; border-radius: 8px; background: color-mix(in srgb, currentColor 4%, transparent); }
  path { fill: none; stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
  .dl { stroke: var(--accent-color); }
  .ul { stroke: var(--success-color); }
  .dl-area { stroke: none; fill: color-mix(in srgb, var(--accent-color) 15%, transparent); }
</style>
