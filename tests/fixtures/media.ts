import { vi } from 'vitest';

/** Stubs `matchMedia` so every query matches `initial`; `set` flips it and notifies the listeners. */
export function stubMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    get matches() {
      return matches;
    },
    addEventListener: (_: 'change', listener: (event: { matches: boolean }) => void) => listeners.add(listener),
    removeEventListener: (_: 'change', listener: (event: { matches: boolean }) => void) => listeners.delete(listener),
  }));
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}
