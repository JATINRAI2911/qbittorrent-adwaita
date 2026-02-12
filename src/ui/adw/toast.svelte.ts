export interface ToastInput {
  title: string;
  undo?: () => void;
  timeoutMs?: number;
}
export interface ToastItem extends ToastInput {
  id: number;
}

/** AdwToastOverlay semantics: one toast at a time; a new toast replaces the current one. */
export class ToastStore {
  current = $state<ToastItem | null>(null);
  #timer: ReturnType<typeof setTimeout> | undefined;
  #id = 0;

  show(input: ToastInput): void {
    clearTimeout(this.#timer);
    const item: ToastItem = { ...input, id: ++this.#id };
    this.current = item;
    this.#timer = setTimeout(() => {
      if (this.current?.id === item.id) this.current = null;
    }, input.timeoutMs ?? (input.undo ? 6000 : 3500));
  }

  dismiss(): void {
    clearTimeout(this.#timer);
    this.current = null;
  }

  undo(): void {
    const undo = this.current?.undo;
    this.dismiss();
    undo?.();
  }
}
