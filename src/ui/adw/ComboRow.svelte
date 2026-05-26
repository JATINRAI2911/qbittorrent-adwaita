<script lang="ts" generics="T extends string">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import Popover from './Popover.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    options: { value: T; label: string }[];
    value: T;
    disabled?: boolean;
  }
  let { title, subtitle, options, value = $bindable(), disabled = false }: Props = $props();
  const id = $props.id();

  // AdwComboRow: the row shows the current value and opens a popover list with a check on it.
  // ARIA "select-only combobox": the row is the combobox, the popover is its listbox.
  let button = $state<HTMLButtonElement>();
  let list = $state<HTMLDivElement>();
  let open = $state(false);
  const current = $derived(options.find((option) => option.value === value));
  const optionEls = () => [...(list?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];

  async function show() {
    if (disabled) return;
    open = true;
    await tick();
    (list?.querySelector<HTMLElement>('[aria-selected="true"]') ?? optionEls()[0])?.focus();
  }

  function hide(refocus = true) {
    open = false;
    if (refocus) button?.focus();
  }

  function choose(next: T) {
    value = next;
    hide();
  }

  function onButtonKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      void show();
    }
  }

  function onListKeydown(event: KeyboardEvent) {
    const items = optionEls();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focus = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focus(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focus(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focus(0);
        break;
      case 'End':
        event.preventDefault();
        focus(-1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        hide();
        break;
      case 'Tab':
        hide(false);
        break;
    }
  }
</script>

<button
  bind:this={button}
  type="button"
  class="row activatable combo-row"
  role="combobox"
  aria-labelledby="{id}-title"
  aria-describedby={subtitle ? `${id}-subtitle` : undefined}
  aria-haspopup="listbox"
  aria-expanded={open}
  aria-controls="{id}-list"
  {disabled}
  onclick={() => (open ? hide() : void show())}
  onkeydown={onButtonKeydown}
>
  <span class="title-box">
    <span class="title" id="{id}-title">{title}</span>
    {#if subtitle}<span class="subtitle" id="{id}-subtitle">{subtitle}</span>{/if}
  </span>
  <span class="combo-value">{current?.label ?? ''}</span>
  <Icon name="pan-down" class="dimmed" />
</button>
{#if open && button}
  <Popover anchor={{ element: button, align: 'end' }} onclose={() => hide(false)} class="menu-popover combo-popover">
    <div class="menu" role="listbox" id="{id}-list" aria-labelledby="{id}-title" tabindex="-1" bind:this={list} onkeydown={onListKeydown}>
      {#each options as option (option.value)}
        {@const selected = option.value === value}
        <div
          class="menu-item"
          role="option"
          tabindex="-1"
          aria-selected={selected}
          onclick={() => choose(option.value)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              choose(option.value);
            }
          }}
        >
          <span class="menu-check">{#if selected}<Icon name="check" />{/if}</span>
          <span class="menu-label">{option.label}</span>
        </div>
      {/each}
    </div>
  </Popover>
{/if}
