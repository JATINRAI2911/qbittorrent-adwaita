import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ToastOverlay from '../../src/ui/adw/ToastOverlay.svelte';
import { ToastStore } from '../../src/ui/adw/toast.svelte';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ToastStore', () => {
  it('replaces the current toast and times out after 3.5 s', () => {
    const store = new ToastStore();
    store.show({ title: 'First' });
    store.show({ title: 'Second' });
    expect(store.current?.title).toBe('Second');
    vi.advanceTimersByTime(3499);
    expect(store.current).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(store.current).toBeNull();
  });

  it('keeps undoable toasts for 6 s and runs undo once', () => {
    const store = new ToastStore();
    const undo = vi.fn();
    store.show({ title: 'Stopped', undo });
    vi.advanceTimersByTime(5999);
    expect(store.current).not.toBeNull();
    store.undo();
    store.undo();
    expect(undo).toHaveBeenCalledTimes(1);
    expect(store.current).toBeNull();
  });

  it('does not let an old timer dismiss a newer toast', () => {
    const store = new ToastStore();
    store.show({ title: 'Old', timeoutMs: 1000 });
    vi.advanceTimersByTime(900);
    store.show({ title: 'New', timeoutMs: 1000 });
    vi.advanceTimersByTime(200);
    expect(store.current?.title).toBe('New');
  });
});

describe('ToastOverlay', () => {
  it('announces the toast and offers Undo and Close', async () => {
    vi.useRealTimers();
    const store = new ToastStore();
    const undo = vi.fn();
    render(ToastOverlay, { store });
    store.show({ title: 'Stopped “ubuntu.iso”', undo });
    flushSync();
    expect(screen.getByRole('status')).toHaveTextContent('Stopped “ubuntu.iso”');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();

    store.show({ title: 'Copied name' });
    flushSync();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
