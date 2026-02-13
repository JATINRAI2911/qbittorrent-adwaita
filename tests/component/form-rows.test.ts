import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Check from '../../src/ui/adw/Check.svelte';
import ComboRow from '../../src/ui/adw/ComboRow.svelte';
import SpinRow from '../../src/ui/adw/SpinRow.svelte';
import SwitchRow from '../../src/ui/adw/SwitchRow.svelte';

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
  it('selects one of its options', async () => {
    render(ComboRow, { title: 'When reached', value: 'Default', options: [{ value: 'Default', label: 'Use global action' }, { value: 'Stop', label: 'Stop torrent' }] });
    const select = screen.getByRole('combobox', { name: 'When reached' });
    await userEvent.selectOptions(select, 'Stop');
    expect(select).toHaveValue('Stop');
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
