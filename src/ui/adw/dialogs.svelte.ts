import type { Component } from 'svelte';

export interface DialogEntry {
  id: number;
  component: Component<Record<string, unknown>>;
  props: Record<string, unknown>;
}

/** Stack of open dialogs; each dialog component receives a `close` prop. */
export class DialogStore {
  stack = $state.raw<DialogEntry[]>([]);
  #id = 0;

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  open<P extends { close: () => void }>(component: Component<P>, props: Omit<P, 'close'>): number {
    const id = ++this.#id;
    this.stack = [
      ...this.stack,
      { id, component: component as unknown as Component<Record<string, unknown>>, props: props as Record<string, unknown> },
    ];
    return id;
  }

  close(id: number): void {
    this.stack = this.stack.filter((entry) => entry.id !== id);
  }

  closeTop(): void {
    this.stack = this.stack.slice(0, -1);
  }
}
