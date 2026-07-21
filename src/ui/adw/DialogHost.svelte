<script lang="ts">
  import type { DialogStore } from './dialogs.svelte';
  import { DURATION, fade } from './motion';

  /** `suspended`: something above every dialog (the login) owns the screen; all dialogs wait inert. */
  let { store, suspended = false }: { store: DialogStore; suspended?: boolean } = $props();

  const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]';

  function tabbables(host: HTMLElement): HTMLElement[] {
    return [...host.querySelectorAll<HTMLElement>(TABBABLE)].filter(
      (el) =>
        el.tabIndex >= 0 &&
        !(el as HTMLButtonElement).disabled &&
        !el.closest('[inert], [aria-hidden="true"], [hidden]') &&
        // Skips controls hidden by CSS (collapsed rows, other pages); jsdom has no checkVisibility.
        (el.checkVisibility?.() ?? true),
    );
  }

  /** Tab and Shift+Tab wrap around inside the top dialog instead of leaving for the page or the browser. */
  function trap(event: KeyboardEvent) {
    if (event.key !== 'Tab' || event.defaultPrevented) return;
    const list = tabbables(event.currentTarget as HTMLElement);
    if (!list.length) return;
    const first = list[0]!;
    const last = list.at(-1)!;
    const active = document.activeElement;
    if (event.shiftKey ? active === first : active === last) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }
</script>

{#each store.stack as entry, i (entry.id)}
  {@const Current = entry.component}
  <!-- Backdrop clicks close the dialog; keyboard users close it with Escape (handled by the app). -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="dialog-host"
    in:fade={{ duration: DURATION.normal }}
    out:fade={{ duration: DURATION.fast }}
    inert={suspended || i < store.stack.length - 1}
    onkeydown={trap}
    onpointerdown={(event) => {
      if (event.target === event.currentTarget) store.close(entry.id);
    }}
  >
    <Current {...entry.props} close={() => store.close(entry.id)} />
  </div>
{/each}
