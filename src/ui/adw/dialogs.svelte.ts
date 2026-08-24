import type { Component } from 'svelte';

export interface DialogEntry {
  id: number;
  component: Component<Record<string, unknown>>;
  props: Record<string, unknown>;
  /** Called once when the dialog closes, whichever way (button, Escape, backdrop). */
  onclose?: () => void;
  /** Reactive: the host closes the dialog once this is true (e.g. every torrent it acts on is gone). */
  closeWhen?: () => boolean;
}

/** Stack of open dialogs; each dialog component receives a `close` prop. */
export class DialogStore {
  stack = $state.raw<DialogEntry[]>([]);
  #id = 0;

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  open<P extends { close: () => void }>(
    component: Component<P>,
    props: Omit<P, 'close'>,
    onclose?: () => void,
    options: { closeWhen?: () => boolean } = {},
  ): number {
    const id = ++this.#id;
    this.stack = [
      ...this.stack,
      { id, component: component as unknown as Component<Record<string, unknown>>, props: props as Record<string, unknown>, onclose, closeWhen: options.closeWhen },
    ];
    return id;
  }

  close(id: number): void {
    const entry = this.stack.find((e) => e.id === id);
    if (!entry) return;
    this.stack = this.stack.filter((e) => e.id !== id);
    entry.onclose?.();
  }

  closeTop(): void {
    const entry = this.stack.at(-1);
    if (entry) this.close(entry.id);
  }
}
