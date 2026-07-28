import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Menu from '../../src/ui/adw/Menu.svelte';
import type { MenuModel } from '../../src/ui/adw/menu';

function model(overrides: { start?: () => void; setCategory?: (c: string) => void } = {}): MenuModel {
  return {
    sections: [
      [{ label: 'Start', accel: 'Space', action: overrides.start }, { label: 'Stop', disabled: true }],
      [
        {
          label: 'Category',
          submenu: () => ({
            title: 'Category',
            sections: [[{ label: 'Films', checked: true, action: () => overrides.setCategory?.('Films') }, { label: 'ISOs', checked: false, action: () => overrides.setCategory?.('ISOs') }]],
          }),
        },
      ],
      [{ label: 'Delete…', destructive: true }],
    ],
  };
}

describe('Menu', () => {
  it('renders sections, accelerators and disabled items', async () => {
    render(Menu, { model: model(), onclose: vi.fn() });
    await tick();
    expect(screen.getByRole('menuitem', { name: /Start/ })).toHaveTextContent('Space');
    expect(screen.getByRole('menuitem', { name: 'Stop' })).toBeDisabled();
    expect(screen.getAllByRole('separator')).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: 'Delete…' })).toHaveClass('destructive');
  });

  it('focuses the first enabled item and moves with the arrow keys, skipping disabled ones', async () => {
    render(Menu, { model: model(), onclose: vi.fn() });
    await tick();
    expect(screen.getByRole('menuitem', { name: /Start/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Category/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Delete…' })).toHaveFocus();
  });

  it('closes, then runs the action, when an item is activated', async () => {
    const order: string[] = [];
    const onclose = vi.fn(() => order.push('close'));
    render(Menu, { model: model({ start: () => order.push('start') }), onclose });
    await tick();
    await userEvent.keyboard('{Enter}');
    expect(order).toEqual(['close', 'start']);
  });

  it('slides into a submenu with check items and back again', async () => {
    const setCategory = vi.fn();
    const onclose = vi.fn();
    render(Menu, { model: model({ setCategory }), onclose });
    await userEvent.click(screen.getByRole('menuitem', { name: /Category/ }));
    await tick();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Films' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: 'ISOs' })).toHaveAttribute('aria-checked', 'false');
    await userEvent.keyboard('{ArrowLeft}');
    await tick();
    expect(screen.getByRole('menuitem', { name: /Start/ })).toBeInTheDocument();

    screen.getByRole('menuitem', { name: /Category/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await tick();
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'ISOs' }));
    expect(setCategory).toHaveBeenCalledWith('ISOs');
    expect(onclose).toHaveBeenCalled();
  });

  it('Escape goes back from a submenu and closes at the root', async () => {
    const onclose = vi.fn();
    render(Menu, { model: model(), onclose });
    await userEvent.click(screen.getByRole('menuitem', { name: /Category/ }));
    await tick();
    await userEvent.keyboard('{Escape}');
    await tick();
    expect(onclose).not.toHaveBeenCalled();
    expect(screen.getByRole('menuitem', { name: /Start/ })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onclose).toHaveBeenCalledTimes(1);
  });

  it('renders one-of-many choices as radio items', () => {
    render(Menu, { model: { sections: [[{ label: 'Name', checked: true, radio: true }, { label: 'Size', checked: false, radio: true }]] }, onclose: vi.fn() });
    expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Size' })).toHaveAttribute('aria-checked', 'false');
  });
});
