import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Check from '../../src/ui/adw/Check.svelte';
import ComboRow from '../../src/ui/adw/ComboRow.svelte';
import SpinRow from '../../src/ui/adw/SpinRow.svelte';
import SwitchRow from '../../src/ui/adw/SwitchRow.svelte';
import TimeRow from '../../src/ui/adw/TimeRow.svelte';

describe('SwitchRow', () => {
  it('is a switch that toggles from the whole row', async () => {
    const onchange = vi.fn();
    render(SwitchRow, { title: 'Also delete files', subtitle: 'Downloaded data stays on disk', onchange });
    const row = screen.getByRole('switch', { name: /Also delete files/ });
    expect(row).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-checked', 'true');
    expect(onchange).toHaveBeenCalledWith(true);
    await userEvent.keyboard(' ');
    expect(row).toHaveAttribute('aria-checked', 'false');
  });
});

describe('SpinRow', () => {
  it('steps with the buttons and clamps to min and max', async () => {
    render(SpinRow, { title: 'Download limit', value: 1, min: 0, max: 2, unit: 'KiB/s' });
    const input = screen.getByRole('textbox', { name: 'Download limit' });
    await userEvent.click(screen.getByRole('button', { name: 'Increase Download limit' }));
    expect(input).toHaveValue('2');
    expect(screen.getByRole('button', { name: 'Increase Download limit' })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, '-9{Enter}');
    expect(input).toHaveValue('0');
    expect(screen.getByRole('button', { name: 'Decrease Download limit' })).toBeDisabled();
    expect(screen.getByText('KiB/s')).toBeInTheDocument();
  });

  it('rounds to the given number of decimal places', async () => {
    render(SpinRow, { title: 'Ratio', value: 1, min: 0, step: 0.1, digits: 2 });
    const input = screen.getByRole('textbox', { name: 'Ratio' });
    await userEvent.clear(input);
    await userEvent.type(input, '1.2345{Enter}');
    expect(input).toHaveValue('1.23');
    await userEvent.click(screen.getByRole('button', { name: 'Increase Ratio' }));
    expect(input).toHaveValue('1.33');
  });
});

describe('ComboRow', () => {
  const options = [{ value: 'Default', label: 'Use global action' }, { value: 'Stop', label: 'Stop torrent' }, { value: 'Remove', label: 'Remove torrent' }];

  it('opens its own popover list instead of a native dropdown, and picks an option', async () => {
    const { container } = render(ComboRow, { title: 'When reached', value: 'Default', options });
    expect(container.querySelector('select')).toBeNull();
    const combo = screen.getByRole('combobox', { name: 'When reached' });
    expect(combo).toHaveTextContent('Use global action');
    await userEvent.click(combo);
    expect(combo).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Use global action' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Stop torrent' }));
    expect(combo).toHaveTextContent('Stop torrent');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(combo).toHaveFocus();
  });

  it('works from the keyboard, and Escape closes only the list', async () => {
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    render(ComboRow, { title: 'When reached', value: 'Default', options });
    const combo = screen.getByRole('combobox', { name: 'When reached' });
    combo.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Use global action' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(combo).toHaveTextContent('Remove torrent');
    await userEvent.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
    window.removeEventListener('keydown', outer);
  });
});

describe('TimeRow', () => {
  it('edits hours and minutes in spin fields, not a native time picker', async () => {
    const { container, component } = render(TimeRow, { title: 'From', value: '08:05' });
    expect(container.querySelector('input[type="time"]')).toBeNull();
    const hour = screen.getByRole('spinbutton', { name: 'From hour' });
    const minute = screen.getByRole('spinbutton', { name: 'From minute' });
    expect([hour, minute].map((i) => (i as HTMLInputElement).value)).toEqual(['08', '05']);
    hour.focus();
    await userEvent.keyboard('{ArrowDown}');
    minute.focus();
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.clear(hour);
    await userEvent.type(hour, '23{Tab}');
    expect((hour as HTMLInputElement).value).toBe('23');
    expect((minute as HTMLInputElement).value).toBe('06');
    void component;
  });

  it('wraps around midnight and the hour, and rejects impossible values', async () => {
    render(TimeRow, { title: 'To', value: '00:59' });
    const hour = screen.getByRole('spinbutton', { name: 'To hour' });
    const minute = screen.getByRole('spinbutton', { name: 'To minute' });
    hour.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect((hour as HTMLInputElement).value).toBe('23');
    minute.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect((minute as HTMLInputElement).value).toBe('00');
    await userEvent.clear(minute);
    await userEvent.type(minute, '75{Tab}');
    expect((minute as HTMLInputElement).value).toBe('59');
  });
});

describe('Check', () => {
  it('exposes its state', () => {
    render(Check, { checked: true, label: 'Select ubuntu.iso', round: true });
    const check = screen.getByRole('checkbox', { name: 'Select ubuntu.iso' });
    expect(check).toHaveAttribute('aria-checked', 'true');
    expect(check).toHaveClass('round');
  });
});
