<script lang="ts">
  import Icon from '../../ui/adw/Icon.svelte';
  import type { LimitValue } from './values';

  interface Props {
    title: string;
    subtitle?: string;
    value: LimitValue;
    min?: number;
    max?: number;
    digits?: number;
    unit?: string;
    onchange: (value: LimitValue, options: { debounce: boolean }) => void;
  }
  let { title, subtitle, value, min = 0, max = Number.MAX_SAFE_INTEGER, digits = 0, unit, onchange }: Props = $props();
  const id = $props.id();
  const text = $derived(value.value.toFixed(digits));

  function set(next: number) {
    const clamped = Math.min(max, Math.max(min, Number.isFinite(next) ? next : min));
    onchange({ on: true, value: Number(clamped.toFixed(digits)) }, { debounce: true });
  }

  function commit(input: HTMLInputElement) {
    set(Number(input.value.replace(',', '.')));
    input.value = text;
  }
</script>

<!-- qBittorrent's “checkbox + number” limits: a switch turns the limit on, the spin sets it. -->
<div class="row limit-row">
  <span class="title-box">
    <span class="title" id="{id}-title">{title}</span>
    {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
  </span>
  {#if value.on}
    <div class="spin">
      <button type="button" class="btn image-button circular" aria-label="Decrease {title}" disabled={value.value <= min} onclick={() => set(value.value - 1)}><Icon name="list-remove" /></button>
      <input
        type="text"
        inputmode="decimal"
        aria-label={title}
        value={text}
        onchange={(event) => commit(event.currentTarget)}
        onkeydown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(event.currentTarget);
          }
        }}
      />
      <button type="button" class="btn image-button circular" aria-label="Increase {title}" disabled={value.value >= max} onclick={() => set(value.value + 1)}><Icon name="list-add" /></button>
    </div>
    {#if unit}<span class="spin-unit">{unit}</span>{/if}
  {/if}
  <button
    type="button"
    class="limit-switch"
    role="switch"
    aria-checked={value.on}
    aria-labelledby="{id}-title"
    onclick={() => onchange({ on: !value.on, value: value.value }, { debounce: false })}
  >
    <span class="switch" class:checked={value.on} aria-hidden="true"><span class="slider"></span></span>
  </button>
</div>

<style>
  .limit-row { gap: 10px; }
  .limit-row .title-box { flex: 1; min-width: 0; }
  .limit-switch { border: 0; background: none; padding: 0; display: inline-flex; border-radius: 14px; }
  .limit-switch:focus-visible { outline: 2px solid var(--focus-ring-color); outline-offset: 2px; }
</style>
