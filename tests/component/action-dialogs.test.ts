import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DeleteDialog from '../../src/features/actions/DeleteDialog.svelte';
import LimitsDialog from '../../src/features/actions/LimitsDialog.svelte';
import MoveDialog from '../../src/features/actions/MoveDialog.svelte';
import NameDialog from '../../src/features/actions/NameDialog.svelte';
import RenameDialog from '../../src/features/actions/RenameDialog.svelte';
import { makeTorrent } from '../fixtures/torrents';

describe('DeleteDialog', () => {
  it('removes without files by default, focusing Cancel', async () => {
    const onconfirm = vi.fn();
    const close = vi.fn();
    render(DeleteDialog, { torrents: [makeTorrent({ name: 'ubuntu.iso' })], onconfirm, close });
    expect(screen.getByRole('alertdialog', { name: 'Delete Torrent?' })).toHaveAccessibleDescription('“ubuntu.iso” will be removed from the transfer list.');
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onconfirm).toHaveBeenCalledWith(false);
    expect(close).toHaveBeenCalled();
  });

  it('warns and relabels the response when files will be deleted too', async () => {
    const onconfirm = vi.fn();
    render(DeleteDialog, { torrents: [makeTorrent({ size: 2e9 }), makeTorrent({ size: 1e9 })], onconfirm, close: vi.fn() });
    expect(screen.getByRole('alertdialog', { name: 'Delete 2 Torrents?' })).toHaveAccessibleDescription('2 torrents (3.0 GB) will be removed from the transfer list.');
    await userEvent.click(screen.getByRole('switch', { name: /Also delete files/ }));
    expect(screen.getByText('Files will be permanently deleted')).toHaveClass('error');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Files' }));
    expect(onconfirm).toHaveBeenCalledWith(true);
  });
});

describe('MoveDialog', () => {
  it('starts from the current folder and only confirms a real change', async () => {
    const onconfirm = vi.fn();
    render(MoveDialog, { torrents: [makeTorrent({ save_path: '/old', auto_tmm: true })], onconfirm, close: vi.fn() });
    const input = screen.getByLabelText('Location');
    expect(input).toHaveValue('/old');
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
    expect(screen.getByText(/Automatic management will be turned off/)).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, '/new{Enter}');
    expect(onconfirm).toHaveBeenCalledWith('/new');
  });
});

describe('RenameDialog', () => {
  it('renames with the typed name', async () => {
    const onconfirm = vi.fn();
    render(RenameDialog, { torrent: makeTorrent({ name: 'old' }), onconfirm, close: vi.fn() });
    const input = screen.getByLabelText('Name');
    await userEvent.clear(input);
    await userEvent.type(input, 'new name');
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(onconfirm).toHaveBeenCalledWith('new name');
  });
});

describe('LimitsDialog', () => {
  it('shows the custom ratio field only for a custom ratio, and returns API values', async () => {
    const onconfirm = vi.fn();
    render(LimitsDialog, { torrents: [makeTorrent({ dl_limit: 0, ratio_limit: -2 })], onconfirm, close: vi.fn() });
    expect(screen.queryByRole('textbox', { name: 'Ratio' })).toBeNull();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ratio limit' }), 'custom');
    expect(screen.getByRole('textbox', { name: 'Ratio' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Increase Download limit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onconfirm).toHaveBeenCalledWith({
      speed: { download: 1024, upload: 0 },
      share: { ratioLimit: 1, seedingTimeLimit: -2, inactiveSeedingTimeLimit: -2, shareLimitAction: 'Default' },
    });
  });
});

describe('NameDialog', () => {
  it('rejects commas for tags', async () => {
    const onconfirm = vi.fn();
    render(NameDialog, { title: 'New Tag', confirmLabel: 'Create', forbidComma: true, onconfirm, close: vi.fn() });
    await userEvent.type(screen.getByLabelText('Name'), 'a,b');
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    expect(screen.getByText('Tag names can’t contain commas.')).toBeInTheDocument();
  });

  it('passes the optional path for categories', async () => {
    const onconfirm = vi.fn();
    render(NameDialog, { title: 'New Category', confirmLabel: 'Create', pathLabel: 'Save path (optional)', onconfirm, close: vi.fn() });
    await userEvent.type(screen.getByLabelText('Name'), 'ISOs');
    await userEvent.type(screen.getByLabelText('Save path (optional)'), '/isos');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onconfirm).toHaveBeenCalledWith('ISOs', '/isos');
  });
});
