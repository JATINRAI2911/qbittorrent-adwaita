<script lang="ts">
  let { title, value = $bindable('00:00') }: { title: string; value?: string } = $props();
  const titleId = $props.id();

  // Hour and minute spin fields, like GNOME Clocks, instead of the browser's native time picker.
  const MAX = { hour: 23, minute: 59 } as const;
  type Part = keyof typeof MAX;

  const parts = $derived.by(() => {
    const [h = 0, m = 0] = value.split(':').map((part) => Number.parseInt(part, 10));
    return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
  });
  const pad = (n: number) => String(n).padStart(2, '0');

  function set(part: Part, next: number) {
    const clamped = Math.min(MAX[part], Math.max(0, next));
    const updated = { ...parts, [part]: clamped };
    value = `${pad(updated.hour)}:${pad(updated.minute)}`;
  }

  function step(part: Part, delta: number) {
    const span = MAX[part] + 1;
    set(part, (((parts[part] + delta) % span) + span) % span);
  }

  function commit(part: Part, input: HTMLInputElement) {
    const typed = Number.parseInt(input.value.replace(/\D/g, ''), 10);
    set(part, Number.isFinite(typed) ? typed : parts[part]);
    input.value = pad(parts[part]);
  }

  function onkeydown(part: Part, event: KeyboardEvent) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      step(part, event.key === 'ArrowUp' ? 1 : -1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit(part, event.currentTarget as HTMLInputElement);
    }
  }
</script>

<div class="row time-row" role="group" aria-labelledby={titleId}>
  <span class="title" id={titleId}>{title}</span>
  <div class="time-fields">
    {#each ['hour', 'minute'] as const as part, i (part)}
      {#if i > 0}<span class="time-sep" aria-hidden="true">:</span>{/if}
      <input
        type="text"
        inputmode="numeric"
        maxlength="2"
        role="spinbutton"
        aria-label="{title} {part}"
        aria-valuemin={0}
        aria-valuemax={MAX[part]}
        aria-valuenow={parts[part]}
        value={pad(parts[part])}
        onkeydown={(event) => onkeydown(part, event)}
        onchange={(event) => commit(part, event.currentTarget)}
        onfocus={(event) => event.currentTarget.select()}
      />
    {/each}
  </div>
</div>

<style>
  .time-row { justify-content: space-between; }
  .time-fields { display: flex; align-items: center; gap: 2px; }
  input {
    width: 2.6em; border: 0; border-radius: 6px; padding: 5px 0; text-align: center; font: inherit;
    font-variant-numeric: tabular-nums; color: inherit; background: var(--button-color);
  }
  input:focus-visible { outline: 2px solid var(--focus-ring-color); outline-offset: 1px; }
  .time-sep { font-weight: 700; opacity: var(--dim-opacity); }
</style>
