import { tick } from 'svelte';

/**
 * Real DOM focus on a torrent's row (list or table), once it is rendered: screen readers follow
 * it, and keys then come from the row. Rows are focusable with tabindex=-1 (roving focus).
 */
export function focusRow(hash: string): void {
  void tick().then(() => document.querySelector<HTMLElement>(`[data-hash="${hash}"]`)?.focus({ preventScroll: true }));
}
