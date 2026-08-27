import { render, screen } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import Popover from '../../src/ui/adw/Popover.svelte';
import PopoverHost from '../../src/ui/adw/PopoverHost.svelte';
import { PopoverStore } from '../../src/ui/adw/popovers.svelte';
import PanelProbe from '../fixtures/PanelProbe.svelte';

const body = createRawSnippet(() => ({ render: () => '<p>Popover body</p>' }));

describe('Popover', () => {
  it('follows the page when it scrolls: menus at a point close, anchored ones re-place', () => {
    const list = document.body.appendChild(document.createElement('div'));
    const anchor = list.appendChild(document.createElement('button'));
    const rect = vi.spyOn(anchor, 'getBoundingClientRect');
    const atPoint = vi.fn();
    const anchored = vi.fn();
    render(Popover, { props: { anchor: { x: 10, y: 10 }, onclose: atPoint, children: body } });
    render(Popover, { props: { anchor: { element: anchor }, onclose: anchored, children: body } });
    const before = rect.mock.calls.length;
    list.dispatchEvent(new Event('scroll'));
    expect(atPoint).toHaveBeenCalledTimes(1);
    expect(anchored).not.toHaveBeenCalled();
    expect(rect.mock.calls.length).toBeGreaterThan(before);
    // Scrolling inside a popover (a long menu) changes nothing.
    screen.getAllByText('Popover body')[0]!.closest('.popover')!.querySelector('.contents')!.dispatchEvent(new Event('scroll'));
    expect(atPoint).toHaveBeenCalledTimes(1);
    list.remove();
  });

  it('draws anchored popovers as plain cards, without an arrow', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    render(Popover, { props: { anchor: { element: anchor }, onclose: vi.fn(), children: body } });
    expect(document.querySelector('.popover')).not.toHaveClass('has-arrow');
    anchor.remove();
  });

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

describe('Popover placement', () => {
  const observers: { callback: () => void; observed: Element[] }[] = [];
  class FakeResizeObserver {
    observed: Element[] = [];
    constructor(readonly callback: () => void) {
      observers.push(this);
    }
    observe(element: Element) {
      this.observed.push(element);
    }
    disconnect() {}
  }
  afterEach(() => {
    vi.unstubAllGlobals();
    observers.length = 0;
  });

  it('re-places itself when its content grows, e.g. when a submenu replaces the root', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    render(Popover, { props: { anchor: { x: 10, y: 700 }, onclose: vi.fn(), children: body } });
    const popover = document.querySelector<HTMLElement>('.popover')!;
    const contents = popover.querySelector<HTMLElement>('.contents')!;
    expect(popover.style.top).toBe('700px');
    expect(observers[0]!.observed).toContain(contents);

    Object.defineProperty(contents, 'scrollHeight', { configurable: true, get: () => 300 });
    observers[0]!.callback();
    flushSync();
    expect(popover.style.top).toBe(`${700 - 300}px`);

    Object.defineProperty(contents, 'scrollHeight', { configurable: true, get: () => 5000 });
    observers[0]!.callback();
    flushSync();
    expect(popover.style.top).toBe('8px');
    expect(contents.style.maxHeight).toBe(`${window.innerHeight - 16}px`);
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

  it('marks the anchor expanded while its menu or panel is open (menu button pattern)', () => {
    const store = new PopoverStore();
    const button = document.body.appendChild(document.createElement('button'));
    const other = document.body.appendChild(document.createElement('button'));
    store.toggleMenu({ sections: [] }, button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    store.togglePanel((() => {}) as never, {}, other);
    expect(button).not.toHaveAttribute('aria-expanded');
    expect(other).toHaveAttribute('aria-expanded', 'true');
    store.close();
    expect(other).not.toHaveAttribute('aria-expanded');
    button.remove();
    other.remove();
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

describe('PopoverStore panels', () => {
  it('shows one popover at a time: a panel replaces a menu and vice versa', () => {
    const store = new PopoverStore();
    const onMenuClose = vi.fn();
    store.openMenu({ sections: [] }, { x: 1, y: 1 }, onMenuClose);
    store.openPanel(PanelProbe, { text: 'Hi' }, { x: 2, y: 2 });
    expect(onMenuClose).toHaveBeenCalledTimes(1);
    expect(store.current).toBeNull();
    expect(store.isOpen).toBe(true);
    store.openMenu({ sections: [] }, { x: 3, y: 3 });
    expect(store.panel).toBeNull();
    store.close();
    expect(store.isOpen).toBe(false);
  });

  it('toggles a panel on the same anchor', () => {
    const store = new PopoverStore();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    store.togglePanel(PanelProbe, { text: 'Hi' }, anchor);
    expect(store.panel).not.toBeNull();
    store.togglePanel(PanelProbe, { text: 'Hi' }, anchor);
    expect(store.panel).toBeNull();
    expect(document.activeElement).toBe(anchor);
    anchor.remove();
  });

  it('renders the panel with an injected close', async () => {
    const store = new PopoverStore();
    render(PopoverHost, { store });
    store.openPanel(PanelProbe, { text: 'Panel body' }, { x: 5, y: 5 });
    await vi.waitFor(() => expect(screen.getByText('Panel body')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(store.isOpen).toBe(false);
  });
});
