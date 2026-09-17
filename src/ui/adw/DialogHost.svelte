<script lang="ts">
  import { tick, untrack } from 'svelte';
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

  /**
   * Tab and Shift+Tab stay inside the top dialog. From a tabbable control the browser moves on its own
   * and only the ends wrap; from anything else (an open combo's option, a row that just left, the page)
   * the next control is found in document order.
   */
  function trap(event: KeyboardEvent, host: HTMLElement) {
    if (event.key !== 'Tab' || event.defaultPrevented) return;
    const list = tabbables(host);
    if (!list.length) return;
    const active = document.activeElement;
    const index = active instanceof HTMLElement ? list.indexOf(active) : -1;
    let target: HTMLElement | undefined;
    if (index >= 0) {
      if (event.shiftKey ? index > 0 : index < list.length - 1) return;
      target = event.shiftKey ? list.at(-1) : list[0];
    } else if (active && active !== document.body && host.contains(active)) {
      const after = (el: HTMLElement) => (active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      target = event.shiftKey ? (list.findLast((el) => !after(el)) ?? list.at(-1)) : (list.find(after) ?? list[0]);
    } else {
      target = event.shiftKey ? list.at(-1) : list[0];
    }
    event.preventDefault();
    target?.focus();
  }

  // When the login that covered the dialogs goes away, focus returns to the top one.
  let wasSuspended = untrack(() => suspended);
  $effect(() => {
    const now = suspended;
    untrack(() => {
      if (wasSuspended && !now && store.isOpen) {
        void tick().then(() => {
          const host = topHost();
          if (host && !host.contains(document.activeElement)) (tabbables(host)[0] ?? host.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]'))?.focus();
        });
      }
      wasSuspended = now;
    });
  });

  // Dialogs whose subject went away close by themselves.
  $effect(() => {
    for (const entry of store.stack) if (entry.closeWhen?.()) untrack(() => store.close(entry.id));
  });

  const topHost = () => [...document.querySelectorAll<HTMLElement>('.dialog-host')].findLast((el) => !el.inert && !el.hasAttribute('aria-hidden'));

  // Focus outside every dialog (fallen to the page, say) is brought back on Tab. Popovers keep their own keys.
  function ondocumentkeydown(event: KeyboardEvent) {
    if (!store.isOpen || suspended || event.key !== 'Tab') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.dialog-host, .popover')) return;
    const host = topHost();
    if (host) trap(event, host);
  }
</script>

<svelte:document onkeydown={ondocumentkeydown} />

{#each store.stack as entry, i (entry.id)}
  {@const Current = entry.component}
  <!-- Backdrop clicks close the dialog; keyboard users close it with Escape (handled by the app). -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="dialog-host"
    in:fade={{ duration: DURATION.normal }}
    out:fade={{ duration: DURATION.fast }}
    inert={suspended || i < store.stack.length - 1}
    onkeydown={(event) => trap(event, event.currentTarget)}
    onpointerdown={(event) => {
      if (event.target === event.currentTarget) store.close(entry.id);
    }}
  >
    <Current {...entry.props} close={() => store.close(entry.id)} />
  </div>
{/each}
