/** Phone width. Stylesheets use the same width in their `@media (max-width: 600px)` rules. */
export const NARROW = '(max-width: 600px)';

/** Calls `onchange` with whether `query` matches now, then on every change; returns the unsubscribe. */
export function watchMedia(query: string, onchange: (matches: boolean) => void): () => void {
  const list = typeof matchMedia === 'function' ? matchMedia(query) : undefined;
  onchange(list?.matches ?? false);
  const listener = (event: { matches: boolean }) => onchange(event.matches);
  list?.addEventListener?.('change', listener);
  return () => list?.removeEventListener?.('change', listener);
}
