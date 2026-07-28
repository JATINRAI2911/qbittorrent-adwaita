<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { DURATION, rise } from './motion';
  import type { MenuItem, MenuModel } from './menu';

  let { model, onclose }: { model: MenuModel; onclose: () => void } = $props();

  let stack = $state.raw<MenuModel[]>([]);
  // Submenus slide in from the right, going back slides in from the left (GtkPopoverMenu).
  let forward = $state(true);
  const current = $derived(stack.at(-1) ?? model);
  const sections = $derived(current.sections.filter((section) => section.length > 0));
  let root: HTMLDivElement;

  const hasChecks = (section: MenuItem[]) => section.some((item) => item.checked !== undefined);
  const items = () => [...root.querySelectorAll<HTMLButtonElement>('[data-menu-item]:not(:disabled)')];

  $effect(() => {
    void current;
    void tick().then(() => items()[0]?.focus());
  });

  function activate(item: MenuItem) {
    if (item.disabled) return;
    if (item.submenu) {
      forward = true;
      stack = [...stack, item.submenu()];
      return;
    }
    onclose();
    item.action?.();
  }

  function back() {
    forward = false;
    stack = stack.slice(0, -1);
  }

  function onkeydown(event: KeyboardEvent) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (i: number) => list[(i + list.length) % list.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focus(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focus(index < 0 ? -1 : index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focus(0);
        break;
      case 'End':
        event.preventDefault();
        focus(-1);
        break;
      case 'ArrowRight':
        if (list[index]?.dataset.submenu !== undefined) {
          event.preventDefault();
          list[index]!.click();
        }
        break;
      case 'ArrowLeft':
      case 'Backspace':
        if (stack.length) {
          event.preventDefault();
          back();
        }
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        if (stack.length) back();
        else onclose();
        break;
    }
  }
</script>

<div class="menu" role="menu" tabindex="-1" aria-label={current.title} bind:this={root} {onkeydown}>
  {#key stack.length}
  <div class="menu-page" in:rise={{ duration: DURATION.normal, x: forward ? (stack.length ? 24 : 0) : -24, opacity: 0.4 }}>
  {#if stack.length}
    <button type="button" class="menu-back" role="menuitem" data-menu-item tabindex="-1" onclick={back}>
      <Icon name="pan-start" /><span>{current.title}</span>
    </button>
    <div class="menu-sep" role="separator"></div>
  {/if}
  {#each sections as section, s (s)}
    {#if s > 0}<div class="menu-sep" role="separator"></div>{/if}
    {#each section as item, i (i)}
      <button
        type="button"
        class="menu-item"
        class:destructive={item.destructive}
        role={item.checked === undefined ? 'menuitem' : item.radio ? 'menuitemradio' : 'menuitemcheckbox'}
        aria-checked={item.checked === undefined ? undefined : item.checked}
        aria-haspopup={item.submenu ? 'menu' : undefined}
        data-menu-item
        data-submenu={item.submenu ? '' : undefined}
        disabled={item.disabled}
        tabindex="-1"
        onclick={() => activate(item)}
      >
        {#if hasChecks(section)}<span class="menu-check">{#if item.checked}<Icon name="check" />{/if}</span>{/if}
        <span class="menu-label">{item.label}</span>
        {#if item.submenu}<span class="menu-arrow"><Icon name="pan-end" /></span>{:else if item.accel}<span class="accelerator">{item.accel}</span>{/if}
      </button>
    {/each}
  {/each}
  </div>
  {/key}
</div>
