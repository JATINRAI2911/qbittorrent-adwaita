import type { Component } from 'svelte';
import type { MenuModel } from './menu';

export type PopoverAnchor = { element: HTMLElement; align?: 'start' | 'center' | 'end' } | { x: number; y: number };

export interface OpenPopover {
  id: number;
  model: MenuModel;
  anchor: PopoverAnchor;
  onclose?: () => void;
}

/** A popover with custom content; the component receives a `close` prop. */
export interface OpenPanel {
  id: number;
  component: Component<Record<string, unknown>>;
  props: Record<string, unknown>;
  anchor: PopoverAnchor;
  onclose?: () => void;
}

/** One popover at a time, like GTK: opening another closes the current one. */
export class PopoverStore {
  current = $state.raw<OpenPopover | null>(null);
  panel = $state.raw<OpenPanel | null>(null);
  #id = 0;

  get isOpen(): boolean {
    return this.current !== null || this.panel !== null;
  }

  openMenu(model: MenuModel, anchor: PopoverAnchor, onclose?: () => void): void {
    this.close();
    this.current = { id: ++this.#id, model, anchor, onclose };
  }

  /** For menu buttons: a second click on the same button closes its menu. */
  toggleMenu(model: MenuModel, element: HTMLElement, align: 'start' | 'center' | 'end' = 'center'): void {
    if (this.#anchoredTo(element)) this.close();
    else this.openMenu(model, { element, align });
  }

  openPanel<P extends { close: () => void }>(component: Component<P>, props: Omit<P, 'close'>, anchor: PopoverAnchor, onclose?: () => void): void {
    this.close();
    this.panel = {
      id: ++this.#id,
      component: component as unknown as Component<Record<string, unknown>>,
      props: props as Record<string, unknown>,
      anchor,
      onclose,
    };
  }

  togglePanel<P extends { close: () => void }>(component: Component<P>, props: Omit<P, 'close'>, element: HTMLElement, align: 'start' | 'center' | 'end' = 'start'): void {
    if (this.#anchoredTo(element)) this.close();
    else this.openPanel(component, props, { element, align });
  }

  close(): void {
    const open = this.current ?? this.panel;
    if (!open) return;
    this.current = null;
    this.panel = null;
    open.onclose?.();
    if ('element' in open.anchor) open.anchor.element.focus();
  }

  #anchoredTo(element: HTMLElement): boolean {
    const open = this.current ?? this.panel;
    return open !== null && 'element' in open.anchor && open.anchor.element === element;
  }
}
