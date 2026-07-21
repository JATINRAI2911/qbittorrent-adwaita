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

/** What a transition returns: a config, or (for `transition:`) a config chosen once Svelte knows the direction. */
export type Transition = TransitionConfig | ((options?: { direction?: 'in' | 'out' }) => TransitionConfig);

/** Elements whose aria-hidden we set, so a reversed exit only removes our own. */
const hiddenByUs = new WeakSet<Element>();

function mark(node: Element, direction: 'in' | 'out'): void {
  if (direction === 'out') {
    if (!node.hasAttribute('aria-hidden')) {
      node.setAttribute('aria-hidden', 'true');
      hiddenByUs.add(node);
    }
  } else if (hiddenByUs.delete(node)) {
    node.removeAttribute('aria-hidden');
  }
}

/**
 * An element that is leaving stays in the DOM for its exit animation; hide it from assistive tech at
 * once (Svelte already makes it inert), so nobody meets a ghost dialog, popover or toast. A
 * bidirectional `transition:` only learns its direction when it runs, so it gets a deferred config.
 */
function withExit(node: Element, options: TransitionOptions | undefined, config: () => TransitionConfig): Transition {
  if (options?.direction === 'both') {
    return (run) => {
      mark(node, run?.direction ?? 'in');
      return config();
    };
  }
  if (options?.direction === 'out') mark(node, 'out');
  return config();
}

export function fade(node: Element, { duration = DURATION.normal }: { duration?: number } = {}, options?: TransitionOptions): Transition {
  return withExit(node, options, () => svelteFade(node, { duration: ms(duration), easing: cubicOut }));
}

/** GtkRevealer's slide: animates height (or width), padding and margin. */
export function slide(node: Element, { duration = DURATION.slow, axis = 'y' }: { duration?: number; axis?: 'x' | 'y' } = {}, options?: TransitionOptions): Transition {
  return withExit(node, options, () => svelteSlide(node, { duration: ms(duration), easing: cubicOut, axis }));
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
export function rise(node: Element, { duration = DURATION.normal, x = 0, y = 0, scale = 1, opacity = 0 }: RiseOptions = {}, options?: TransitionOptions): Transition {
  return withExit(node, options, () => riseConfig(node, { duration, x, y, scale, opacity }));
}

function riseConfig(node: Element, { duration, x, y, scale, opacity }: Required<RiseOptions>): TransitionConfig {
  const inline = (node as HTMLElement).style?.transform;
  const computed = inline || getComputedStyle(node).transform;
  const base = computed && computed !== 'none' ? `${computed} ` : '';
  return {
    duration: ms(duration),
    easing: cubicOut,
    css: (t, u) => `opacity: ${opacity + (1 - opacity) * t}; transform: ${base}translate(${u * x}px, ${u * y}px) scale(${scale + (1 - scale) * t});`,
  };
}
