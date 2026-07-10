import { cubicOut } from 'svelte/easing';
import { fade as svelteFade, slide as svelteSlide, type TransitionConfig } from 'svelte/transition';

/** libadwaita-style timings: reveals 250 ms, most things 200 ms, exits and small popups 150 ms, ease-out-cubic. */
export const DURATION = { fast: 150, normal: 200, slow: 250 } as const;

/**
 * Off for prefers-reduced-motion, and where the Web Animations API is missing (jsdom). A zero
 * duration makes Svelte finish a transition at once, so outros never delay removal there.
 */
export function motionEnabled(): boolean {
  if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return false;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

const ms = (duration: number) => (motionEnabled() ? duration : 0);

/** Svelte passes each transition its direction. */
export interface TransitionOptions {
  direction?: 'in' | 'out' | 'both';
}

/**
 * An element that is leaving stays in the DOM for its exit animation; hide it from assistive tech at
 * once (Svelte already makes it inert), so nobody meets a ghost dialog, popover or toast.
 */
function leaving(node: Element, options?: TransitionOptions): void {
  if (options?.direction === 'out') node.setAttribute('aria-hidden', 'true');
}

export function fade(node: Element, { duration = DURATION.normal }: { duration?: number } = {}, options?: TransitionOptions): TransitionConfig {
  leaving(node, options);
  return svelteFade(node, { duration: ms(duration), easing: cubicOut });
}

/** GtkRevealer's slide: animates height (or width), padding and margin. */
export function slide(node: Element, { duration = DURATION.slow, axis = 'y' }: { duration?: number; axis?: 'x' | 'y' } = {}, options?: TransitionOptions): TransitionConfig {
  leaving(node, options);
  return svelteSlide(node, { duration: ms(duration), easing: cubicOut, axis });
}

export interface RiseOptions {
  duration?: number;
  /** Offset in px the element travels from (in) or to (out). */
  x?: number;
  y?: number;
  /** Scale at the offset end. */
  scale?: number;
  /** Opacity at the offset end. */
  opacity?: number;
}

/** Fade plus a small move/scale, like popovers, dialogs and toasts appearing. */
export function rise(node: Element, { duration = DURATION.normal, x = 0, y = 0, scale = 1, opacity = 0 }: RiseOptions = {}, options?: TransitionOptions): TransitionConfig {
  leaving(node, options);
  const inline = (node as HTMLElement).style?.transform;
  const computed = inline || getComputedStyle(node).transform;
  const base = computed && computed !== 'none' ? `${computed} ` : '';
  return {
    duration: ms(duration),
    easing: cubicOut,
    css: (t, u) => `opacity: ${opacity + (1 - opacity) * t}; transform: ${base}translate(${u * x}px, ${u * y}px) scale(${scale + (1 - scale) * t});`,
  };
}
