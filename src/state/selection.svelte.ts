import { SvelteSet } from 'svelte/reactivity';

export interface ClickModifiers {
  shift: boolean;
  /** Ctrl on Linux/Windows, Cmd on macOS. */
  toggle: boolean;
}

export function rangeBetween(order: readonly string[], a: string, b: string): string[] {
  const i = order.indexOf(a);
  const j = order.indexOf(b);
  if (i < 0 || j < 0) return [b];
  return order.slice(Math.min(i, j), Math.max(i, j) + 1);
}

/**
 * Row selection. Outside selection mode there is at most one selected row (a plain click);
 * selection mode (GNOME) is entered with Ctrl/Shift-click, Shift+arrows, Select All or the ☑ button.
 */
export class Selection {
  mode = $state(false);
  anchor = $state<string | null>(null);
  focus = $state<string | null>(null);
  /** True while the user navigates with the keyboard, to show the focus ring. */
  keyboard = $state(false);
  /** Row whose context menu is open. */
  menuTarget = $state<string | null>(null);
  readonly selected = new SvelteSet<string>();

  get size(): number {
    return this.selected.size;
  }

  has(hash: string): boolean {
    return this.selected.has(hash);
  }

  click(hash: string, modifiers: ClickModifiers, order: readonly string[]): void {
    this.keyboard = false;
    if (modifiers.shift) {
      const range = rangeBetween(order, this.anchor ?? this.focus ?? hash, hash);
      if (!this.mode || !modifiers.toggle) this.#replace(range);
      else range.forEach((h) => this.selected.add(h));
      this.mode = true;
      this.focus = hash;
      return;
    }
    if (modifiers.toggle && !this.mode) {
      this.#replace([...[...this.selected].filter((h) => h !== hash), hash]);
      this.mode = true;
    } else if (this.mode) {
      this.toggle(hash);
    } else {
      this.#replace([hash]);
    }
    this.anchor = hash;
    this.focus = hash;
  }

  toggle(hash: string): void {
    if (this.selected.has(hash)) this.selected.delete(hash);
    else this.selected.add(hash);
  }

  moveFocus(delta: 1 | -1, extend: boolean, order: readonly string[]): string | null {
    if (order.length === 0) return null;
    const current = this.focus ? order.indexOf(this.focus) : -1;
    const next = current < 0 ? (delta > 0 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, current + delta));
    const hash = order[next]!;
    this.keyboard = true;
    if (extend) {
      if (!this.mode) {
        this.anchor = this.focus ?? hash;
        this.mode = true;
      }
      this.#replace(rangeBetween(order, this.anchor ?? hash, hash));
    } else if (!this.mode) {
      this.#replace([hash]);
      this.anchor = hash;
    }
    this.focus = hash;
    return hash;
  }

  selectAll(hashes: readonly string[]): void {
    this.#replace(hashes);
    this.mode = true;
  }

  enter(): void {
    this.mode = true;
  }

  exit(): void {
    this.mode = false;
    this.selected.clear();
    this.anchor = null;
  }

  clear(): void {
    this.selected.clear();
    this.anchor = null;
    this.focus = null;
  }

  /** Forget torrents that no longer exist; leave selection mode if that emptied it. */
  prune(exists: (hash: string) => boolean): void {
    let removed = 0;
    for (const hash of [...this.selected]) {
      if (!exists(hash)) {
        this.selected.delete(hash);
        removed++;
      }
    }
    if (this.focus && !exists(this.focus)) this.focus = null;
    if (this.anchor && !exists(this.anchor)) this.anchor = null;
    if (this.menuTarget && !exists(this.menuTarget)) this.menuTarget = null;
    if (removed > 0 && this.mode && this.selected.size === 0) this.exit();
  }

  targets(): string[] {
    return [...this.selected];
  }

  #replace(hashes: readonly string[]): void {
    this.selected.clear();
    for (const hash of hashes) this.selected.add(hash);
  }
}
