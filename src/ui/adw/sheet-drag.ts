import { SHEET_MAX, SHEET_MIN } from '../../state/prefs.svelte';

/** Released below this fraction of the window, the sheet collapses to its bar. */
export const SHEET_COLLAPSE = 0.25;

/** The sheet height while dragging: dragging up by N px grows it by N / viewport height. */
export function dragFraction(start: number, startY: number, y: number, viewportHeight: number): number {
  return Math.min(1, Math.max(0, start + (startY - y) / viewportHeight));
}

export function settleSheet(fraction: number): { collapse: boolean; fraction: number } {
  if (fraction < SHEET_COLLAPSE) return { collapse: true, fraction };
  return { collapse: false, fraction: Math.min(SHEET_MAX, Math.max(SHEET_MIN, fraction)) };
}
