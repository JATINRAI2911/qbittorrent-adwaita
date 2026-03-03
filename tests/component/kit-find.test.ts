import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchEntry from '../../src/ui/adw/SearchEntry.svelte';
import ToggleGroup from '../../src/ui/adw/ToggleGroup.svelte';

const options = [
  { value: 'all', label: 'All' },
  { value: 'downloading', label: 'Downloading' },
  { value: 'seeding', label: 'Seeding' },
];

describe('ToggleGroup', () => {
  it('is a radio group that reports clicks', async () => {
    const onchange = vi.fn();
    render(ToggleGroup, { label: 'Status', options, value: 'all', onchange });
    expect(screen.getByRole('radiogroup', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'All' })).toHaveClass('checked');
    await userEvent.click(screen.getByRole('radio', { name: 'Seeding' }));
    expect(onchange).toHaveBeenCalledWith('seeding');
  });

  it('moves with the arrow keys, wrapping around', async () => {
    const onchange = vi.fn();
    render(ToggleGroup, { label: 'Status', options, value: 'all', onchange });
    screen.getByRole('radio', { name: 'All' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onchange).toHaveBeenLastCalledWith('downloading');
    await userEvent.keyboard('{ArrowLeft}');
    expect(onchange).toHaveBeenLastCalledWith('seeding');
    expect(screen.getByRole('radio', { name: 'Downloading' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('SearchEntry', () => {
  it('shows a clear button only while it has text, and clearing refocuses the field', async () => {
    render(SearchEntry, { label: 'Search torrents', placeholder: 'Search torrents' });
    const box = screen.getByRole('searchbox', { name: 'Search torrents' });
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    await userEvent.type(box, 'ubu');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(box).toHaveValue('');
    expect(box).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});
