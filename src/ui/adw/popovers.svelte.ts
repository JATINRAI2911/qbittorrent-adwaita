import type { MenuModel } from './menu';

export type PopoverAnchor = { element: HTMLElement; align?: 'start' | 'center' | 'end' } | { x: number; y: number };

export interface OpenPopover {
  id: number;
  model: MenuModel;
  anchor: PopoverAnchor;
  onclose?: () => void;
}

/** One popover at a time, like GTK: opening another closes the current one. */
export class PopoverStore {
  current = $state.raw<OpenPopover | null>(null);
  #id = 0;

  openMenu(model: MenuModel, anchor: PopoverAnchor, onclose?: () => void): void {
    this.close();
    this.current = { id: ++this.#id, model, anchor, onclose };
  }

  /** For menu buttons: a second click on the same button closes its menu. */
  toggleMenu(model: MenuModel, element: HTMLElement, align: 'start' | 'center' | 'end' = 'center'): void {
    const current = this.current;
    if (current && 'element' in current.anchor && current.anchor.element === element) this.close();
    else this.openMenu(model, { element, align });
  }

  close(): void {
    const current = this.current;
    if (!current) return;
    this.current = null;
    current.onclose?.();
    if ('element' in current.anchor) current.anchor.element.focus();
  }
}
