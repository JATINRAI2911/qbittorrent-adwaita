import { afterEach, describe, expect, it, vi } from 'vitest';
import { fade, motionEnabled, rise, slide } from '../../src/ui/adw/motion';

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
});
