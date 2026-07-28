<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    digits?: number;
    unit?: string;
    /** Focus leaving the row (after typing or +/−), or Enter: the value is final. */
    oncommit?: () => void;
    /** Id of a note under the row that explains or reports on this field. */
    describedby?: string;
  }
  let { title, subtitle, value = $bindable(0), min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, digits = 0, unit, oncommit, describedby }: Props = $props();

  const text = $derived(value.toFixed(digits));

  function set(next: number) {
    const clamped = Math.min(max, Math.max(min, Number.isFinite(next) ? next : min));
    value = Number(clamped.toFixed(digits));
  }

  function commit(input: HTMLInputElement) {
    set(Number(input.value.replace(',', '.')));
    input.value = text;
  }
</script>

<div
  class="row spin-row"
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) oncommit?.();
  }}
>
  <span class="title-box">
    <span class="title">{title}</span>
    {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
  </span>
  <div class="spin">
    <button type="button" class="btn image-button circular" aria-label="Decrease {title}" disabled={value <= min} onclick={() => set(value - step)}><Icon name="list-remove" /></button>
    <input
      type="text"
      inputmode="decimal"
      aria-label={title}
      aria-describedby={describedby}
      value={text}
      onchange={(event) => commit(event.currentTarget)}
      onkeydown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit(event.currentTarget);
          oncommit?.();
        }
      }}
    />
    <button type="button" class="btn image-button circular" aria-label="Increase {title}" disabled={value >= max} onclick={() => set(value + step)}><Icon name="list-add" /></button>
  </div>
  {#if unit}<span class="spin-unit">{unit}</span>{/if}
</div>
