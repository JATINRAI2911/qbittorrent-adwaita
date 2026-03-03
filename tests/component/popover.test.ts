import { render, screen } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('runs onclose once when replaced', () => {
    const store = new PopoverStore();
    const onclose = vi.fn();
    store.openMenu({ sections: [] }, { x: 1, y: 1 }, onclose);
    store.openMenu({ sections: [] }, { x: 2, y: 2 });
    store.close();
    expect(onclose).toHaveBeenCalledTimes(1);
  });
});
