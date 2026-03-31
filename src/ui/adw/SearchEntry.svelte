<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from './Icon.svelte';

  interface Props {
    label: string;
    placeholder?: string;
    value?: string;
    input?: HTMLInputElement;
    onkeydown?: HTMLInputAttributes['onkeydown'];
  }
  let { label, placeholder, value = $bindable(''), input = $bindable(), onkeydown }: Props = $props();

  // GNOME search entries: Esc clears the text first; only an empty entry lets Esc through.
  function handleKeydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
    if (event.key === 'Escape' && value) {
      event.preventDefault();
      event.stopPropagation();
      value = '';
      return;
    }
    onkeydown?.(event);
  }
</script>

<div class="entry search-entry">
  <Icon name="search" />
  <input bind:this={input} type="search" aria-label={label} {placeholder} spellcheck="false" autocomplete="off" bind:value onkeydown={handleKeydown} />
  {#if value}
    <button
      type="button"
      class="entry-clear"
      aria-label="Clear"
      onclick={() => {
        value = '';
        input?.focus();
      }}><Icon name="close" /></button
    >
  {/if}
</div>
