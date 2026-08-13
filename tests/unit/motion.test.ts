import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TransitionConfig } from 'svelte/transition';
import { fade as fadeT, motionEnabled, rise as riseT, slide as slideT, type Transition } from '../../src/ui/adw/motion';

// Called without a direction, the helpers return a plain config.
const plain = <A extends unknown[]>(fn: (...args: A) => Transition) => (...args: A) => fn(...args) as TransitionConfig;
const fade = plain(fadeT);
const slide = plain(slideT);
const rise = plain(riseT);

const node = () => document.createElement('div');
const original = Element.prototype.animate;

function withMotion(reduced: boolean) {
  Element.prototype.animate = vi.fn() as unknown as typeof Element.prototype.animate;
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduced && query.includes('reduce'), media: query }));
}

afterEach(() => {
  Element.prototype.animate = original;
  vi.unstubAllGlobals();
});

describe('motion', () => {
  it('animates with libadwaita-style timings when the browser can and the user allows it', () => {
    withMotion(false);
    expect(motionEnabled()).toBe(true);
    expect(fade(node()).duration).toBe(200);
    expect(slide(node()).duration).toBe(250);
    expect(rise(node(), { duration: 150, y: -4 }).duration).toBe(150);
  });

  it('turns every transition off for people who ask for reduced motion', () => {
    withMotion(true);
    expect(motionEnabled()).toBe(false);
    expect([fade(node()).duration, slide(node()).duration, rise(node()).duration]).toEqual([0, 0, 0]);
  });

  it('finishes instantly where the Web Animations API is missing (jsdom), so removal is immediate', () => {
    expect(motionEnabled()).toBe(false);
    expect(rise(node(), { y: 16 }).duration).toBe(0);
  });

  it('eases from the offset to rest, keeping any transform the element already has', () => {
    withMotion(false);
    const el = node();
    el.style.transform = 'translateX(-50%)';
    const css = rise(el, { y: 16, scale: 0.96 }).css!;
    expect(css(0, 1)).toBe('opacity: 0; transform: translateX(-50%) translate(0px, 16px) scale(0.96);');
    expect(css(1, 0)).toBe('opacity: 1; transform: translateX(-50%) translate(0px, 0px) scale(1);');
  });

  it('takes a leaving element out of the accessibility tree the moment its exit starts', () => {
    const leaving = node();
    fade(leaving, {}, { direction: 'out' });
    expect(leaving.getAttribute('aria-hidden')).toBe('true');
    const arriving = node();
    rise(arriving, {}, { direction: 'in' });
    slide(arriving, {}, { direction: 'in' });
    expect(arriving.hasAttribute('aria-hidden')).toBe(false);
  });

  it('also hides a bidirectional (transition:) element while it leaves, and shows it again if it comes back', () => {
    type Deferred = (options: { direction: 'in' | 'out' }) => TransitionConfig;
    const el = node();
    const config = slideT(el, {}, { direction: 'both' }) as Deferred;
    expect(config({ direction: 'out' }).duration).toBe(0);
    expect(el.getAttribute('aria-hidden')).toBe('true');
    config({ direction: 'in' });
    expect(el.hasAttribute('aria-hidden')).toBe(false);

    const decorative = node();
    decorative.setAttribute('aria-hidden', 'true');
    const again = fadeT(decorative, {}, { direction: 'both' }) as Deferred;
    again({ direction: 'out' });
    again({ direction: 'in' });
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
  });

  it('releases focus held inside a leaving element, so keys stop going to it', () => {
    const leaving = document.body.appendChild(node());
    const button = leaving.appendChild(document.createElement('button'));
    button.focus();
    expect(button).toHaveFocus();
    fade(leaving, {}, { direction: 'out' });
    expect(button).not.toHaveFocus();
    leaving.remove();

    const staying = document.body.appendChild(node());
    const elsewhere = document.body.appendChild(document.createElement('button'));
    elsewhere.focus();
    fade(staying, {}, { direction: 'out' });
    expect(elsewhere).toHaveFocus();
    staying.remove();
    elsewhere.remove();
  });
});

