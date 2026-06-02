import { describe, expect, it, vi } from 'vitest';
import { DialogStore } from '../../src/ui/adw/dialogs.svelte';

const Fake = (() => {}) as never;

describe('DialogStore', () => {
  it('tells the opener when its dialog closes, however it closes', () => {
    const store = new DialogStore();
    const first = vi.fn();
    const second = vi.fn();
    const id = store.open(Fake, {}, first);
    store.open(Fake, {}, second);
    store.closeTop();
    expect(second).toHaveBeenCalledTimes(1);
    store.close(id);
    expect(first).toHaveBeenCalledTimes(1);
    store.close(id);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
