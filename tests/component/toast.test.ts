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
  it('keeps one live region mounted, so each new toast is announced as it is added', () => {
    const store = new ToastStore();
    render(ToastOverlay, { store });
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');
    store.show({ title: 'Stopped “ubuntu.iso”' });
    flushSync();
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Stopped “ubuntu.iso”');
    store.show({ title: 'Started “ubuntu.iso”', undo: () => {} });
    flushSync();
    expect(screen.getByRole('status')).toBe(region);
    // Only the new title is announced: not the button labels, nor a toast still fading out.
    expect(region.textContent).toBe('Started “ubuntu.iso”');
  });

  it('behind a dialog, still announces the toast but keeps its buttons out of the Tab order', () => {
    const store = new ToastStore();
    render(ToastOverlay, { store, behindDialog: true });
    store.show({ title: 'Couldn’t save the cookies', undo: vi.fn() });
    flushSync();
    expect(document.querySelector<HTMLElement>('.toast-overlay')!.inert).not.toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('Couldn’t save the cookies');
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveAttribute('tabindex', '-1');
  });

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
    expect(screen.getByRole('status').textContent).toBe('');

    store.show({ title: 'Copied name' });
    flushSync();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
