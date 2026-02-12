import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Popover from '../../src/ui/adw/Popover.svelte';
import { PopoverStore } from '../../src/ui/adw/popovers.svelte';

const body = createRawSnippet(() => ({ render: () => '<p>Popover body</p>' }));

describe('Popover', () => {
  it('renders its content and closes on an outside pointerdown, but not inside or on the anchor', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const onclose = vi.fn();
    render(Popover, { props: { anchor: { element: anchor }, onclose, children: body } });
    expect(screen.getByText('Popover body')).toBeInTheDocument();

    screen.getByText('Popover body').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    anchor.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onclose).not.toHaveBeenCalled();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onclose).toHaveBeenCalledTimes(1);
    anchor.remove();
  });
});

describe('PopoverStore', () => {
  it('toggles a menu on the same anchor and returns focus to it when closing', () => {
    const store = new PopoverStore();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const model = { sections: [[{ label: 'Log Out' }]] };
    store.toggleMenu(model, anchor);
    expect(store.current?.model).toBe(model);
    store.toggleMenu(model, anchor);
    expect(store.current).toBeNull();
    expect(document.activeElement).toBe(anchor);
    anchor.remove();
  });

  it('runs onclose once when replaced', () => {
    const store = new PopoverStore();
    const onclose = vi.fn();
    store.openMenu({ sections: [] }, { x: 1, y: 1 }, onclose);
    store.openMenu({ sections: [] }, { x: 2, y: 2 });
    store.close();
    expect(onclose).toHaveBeenCalledTimes(1);
  });
});
