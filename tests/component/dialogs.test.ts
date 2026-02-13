import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet, flushSync, tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import AlertDialog from '../../src/ui/adw/AlertDialog.svelte';
import Dialog from '../../src/ui/adw/Dialog.svelte';
import DialogHost from '../../src/ui/adw/DialogHost.svelte';
import { DialogStore } from '../../src/ui/adw/dialogs.svelte';

const field = createRawSnippet(() => ({ render: () => '<input aria-label="Name" />' }));

describe('Dialog', () => {
  it('has Cancel and a confirm button, focuses the first field and confirms on Enter', async () => {
    const onconfirm = vi.fn();
    const close = vi.fn();
    render(Dialog, { title: 'Rename Torrent', confirmLabel: 'Rename', onconfirm, close, children: field });
    await tick();
    expect(screen.getByRole('dialog', { name: 'Rename Torrent' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onconfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('shows a round close button when it has nothing to confirm', async () => {
    const close = vi.fn();
    render(Dialog, { title: 'Statistics', close, children: field });
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(close).toHaveBeenCalled();
  });

  it('does not confirm while the confirm button is disabled', async () => {
    const onconfirm = vi.fn();
    render(Dialog, { title: 'Move', confirmLabel: 'Move', confirmDisabled: true, onconfirm, close: vi.fn(), children: field });
    await tick();
    await userEvent.keyboard('{Enter}');
    expect(onconfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });
});

describe('AlertDialog', () => {
  it('focuses the first response and reports the chosen one', async () => {
    const onresponse = vi.fn();
    const close = vi.fn();
    render(AlertDialog, {
      heading: 'Delete Torrent?',
      body: '“ubuntu.iso” will be removed.',
      responses: [{ id: 'cancel', label: 'Cancel' }, { id: 'remove', label: 'Remove', variant: 'destructive' }],
      onresponse,
      close,
    });
    await tick();
    expect(screen.getByRole('alertdialog', { name: 'Delete Torrent?' })).toHaveAccessibleDescription('“ubuntu.iso” will be removed.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('destructive-action');
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(close).toHaveBeenCalled();
    expect(onresponse).toHaveBeenCalledWith('remove');
  });
});

describe('DialogHost', () => {
  it('stacks dialogs, makes lower ones inert and closes the top one from the backdrop', async () => {
    const store = new DialogStore();
    render(DialogHost, { store });
    store.open(Dialog, { title: 'First', children: field });
    store.open(Dialog, { title: 'Second', children: field });
    flushSync();
    const hosts = document.querySelectorAll<HTMLElement>('.dialog-host');
    expect(hosts).toHaveLength(2);
    // Svelte sets the `inert` property; jsdom does not reflect it to the attribute like browsers do.
    expect(hosts[0]!.inert).toBe(true);
    expect(hosts[1]!.inert).toBe(false);

    hosts[1]!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    flushSync();
    expect(store.stack).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(store.isOpen).toBe(false);
  });
});
