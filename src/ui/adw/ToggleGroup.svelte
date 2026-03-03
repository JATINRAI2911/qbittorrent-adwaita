<script lang="ts" generics="T extends string">
  import { tick } from 'svelte';

  interface Props {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onchange: (value: T) => void;
  }
  let { label, options, value, onchange }: Props = $props();
  let root: HTMLDivElement;

  function onkeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length]!;
    onchange(next.value);
    void tick().then(() => root.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  }
</script>

<div class="toggle-group" role="radiogroup" aria-label={label} bind:this={root}>
  {#each options as option (option.value)}
    <button
      type="button"
      class="toggle"
      class:checked={option.value === value}
      role="radio"
      aria-checked={option.value === value}
      tabindex={option.value === value ? 0 : -1}
      onclick={() => onchange(option.value)}
      {onkeydown}>{option.label}</button
    >
  {/each}
</div>
