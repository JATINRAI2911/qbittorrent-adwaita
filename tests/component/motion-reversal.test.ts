import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import Reversible from '../fixtures/Reversible.svelte';

const original = Element.prototype.animate;
afterEach(() => {
  Element.prototype.animate = original;
  vi.unstubAllGlobals();
});

it('shows an element to assistive tech again when its exit is reversed before it ends', async () => {
  // Like a browser, zero-length (delay) animations finish at once; real ones keep running, so the
  // exit is still in progress when it is reversed.
  Element.prototype.animate = vi.fn((_keyframes: unknown, options: { duration?: number }) => {
    const animation = { cancel() {}, onfinish: null as null | (() => void), currentTime: 0, playState: 'running', effect: null };
    if (!options?.duration) setTimeout(() => animation.onfinish?.());
    return animation;
  }) as never;
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
  const view = render(Reversible, { show: true });
  await tick();
  const list = view.getByTestId('list');
  await view.rerender({ show: false });
  await tick();
  await new Promise((r) => setTimeout(r, 10));
  expect(list).toHaveAttribute('aria-hidden', 'true');
  await view.rerender({ show: true });
  await tick();
  await new Promise((r) => setTimeout(r, 10));
  expect(list.isConnected).toBe(true);
  expect(list).not.toHaveAttribute('aria-hidden');
});
