import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TextDialog from '../../src/features/details/TextDialog.svelte';
import TextListDialog from '../../src/features/details/TextListDialog.svelte';

describe('TextDialog', () => {
  it('edits a value, validating it', async () => {
    const onconfirm = vi.fn();
    const close = vi.fn();
    render(TextDialog, {
      title: 'Edit Tracker',
      label: 'URL',
      value: 'udp://a:1',
      confirmLabel: 'Save',
      validate: (v: string) => (/^[a-z]+:\/\//.test(v) ? null : 'Enter a full URL.'),
      onconfirm,
      close,
    });
    const input = screen.getByLabelText('URL');
    expect(input).toHaveValue('udp://a:1');
    await userEvent.clear(input);
    await userEvent.type(input, 'nope');
    expect(screen.getByText('Enter a full URL.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'udp://b:2{Enter}');
    expect(onconfirm).toHaveBeenCalledWith('udp://b:2');
    expect(close).toHaveBeenCalled();
  });
});

describe('TextListDialog', () => {
  it('takes several lines and is disabled while blank', async () => {
    const onconfirm = vi.fn();
    render(TextListDialog, { title: 'Add Trackers', label: 'Tracker URLs', placeholder: 'One per line', confirmLabel: 'Add', onconfirm, close: vi.fn() });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Tracker URLs'), 'udp://a:1{Enter}{Enter}udp://b:2');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onconfirm).toHaveBeenCalledWith('udp://a:1\n\nudp://b:2');
  });

  it('edits an existing multi-line value, keeping line breaks, and can empty it', async () => {
    const onconfirm = vi.fn();
    render(TextListDialog, { title: 'Edit Comment', label: 'Comment', value: 'line one\nline two', allowEmpty: true, confirmLabel: 'Save', onconfirm, close: vi.fn() });
    const box = screen.getByLabelText('Comment');
    expect(box).toHaveValue('line one\nline two');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.type(box, '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onconfirm).toHaveBeenLastCalledWith('line one\nline two!');
    await userEvent.clear(box);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onconfirm).toHaveBeenLastCalledWith('');
  });

  it('shows a list read-only, with only a way to close it', () => {
    render(TextListDialog, { title: 'Fetched trackers', label: 'Tracker URLs', value: 'udp://a.example:1337', readonly: true, confirmLabel: 'Save', onconfirm: vi.fn(), close: vi.fn() });
    expect(screen.getByLabelText('Tracker URLs')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

