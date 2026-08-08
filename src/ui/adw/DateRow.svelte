<script lang="ts">
  let { title, value = $bindable('') }: { title: string; value?: string } = $props();
  const titleId = $props.id();

  // Year, month and day spin fields (no native date picker), like TimeRow.
  const RANGE = { year: [1970, 9999], month: [1, 12], day: [1, 31] } as const;
  type Part = keyof typeof RANGE;

  const parts = $derived.by(() => {
    const [y, m, d] = value.split('-').map((part) => Number.parseInt(part, 10));
    const now = new Date();
    return { year: y || now.getFullYear(), month: m || now.getMonth() + 1, day: d || now.getDate() };
  });
  const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');

  function set(part: Part, next: number) {
    const [min, max] = RANGE[part];
    const updated = { ...parts, [part]: Math.min(max, Math.max(min, next)) };
    updated.day = Math.min(updated.day, daysIn(updated.year, updated.month));
    value = `${pad(updated.year, 4)}-${pad(updated.month)}-${pad(updated.day)}`;
  }

  function step(part: Part, delta: number) {
    const [min, max] = RANGE[part];
    if (part === 'year') set(part, parts.year + delta);
    else {
      // The day wraps within this month (28 February ↑ is 1 February), not at 31.
      const span = part === 'day' ? daysIn(parts.year, parts.month) : max - min + 1;
      set(part, ((((parts[part] - min + delta) % span) + span) % span) + min);
    }
  }

  function commit(part: Part, input: HTMLInputElement) {
    const typed = Number.parseInt(input.value.replace(/\D/g, ''), 10);
    set(part, Number.isFinite(typed) ? typed : parts[part]);
    input.value = part === 'year' ? pad(parts.year, 4) : pad(parts[part]);
  }
</script>

<div class="row date-row" role="group" aria-labelledby={titleId}>
  <span class="title" id={titleId}>{title}</span>
  <div class="date-fields">
    {#each ['year', 'month', 'day'] as const as part, i (part)}
      {#if i > 0}<span class="date-sep" aria-hidden="true">-</span>{/if}
      <input
        type="text"
        inputmode="numeric"
        class={part}
        maxlength={part === 'year' ? 4 : 2}
        role="spinbutton"
        aria-label="{title} {part}"
        aria-valuemin={RANGE[part][0]}
        aria-valuemax={RANGE[part][1]}
        aria-valuenow={parts[part]}
        value={part === 'year' ? pad(parts.year, 4) : pad(parts[part])}
        onkeydown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            step(part, event.key === 'ArrowUp' ? 1 : -1);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            commit(part, event.currentTarget);
          }
        }}
        onchange={(event) => commit(part, event.currentTarget)}
        onfocus={(event) => event.currentTarget.select()}
      />
    {/each}
  </div>
</div>

<style>
  .date-row { justify-content: space-between; }
  .date-fields { display: flex; align-items: center; gap: 2px; }
  input { width: 2.6em; border: 0; border-radius: 6px; padding: 5px 0; text-align: center; font: inherit; font-variant-numeric: tabular-nums; color: inherit; background: var(--button-color); }
  input.year { width: 3.8em; }
  input:focus-visible { outline: 2px solid var(--focus-ring-color); outline-offset: 1px; }
  .date-sep { opacity: var(--dim-opacity); }
</style>
