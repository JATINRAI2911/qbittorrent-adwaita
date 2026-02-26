export type KeyCommand =
  | 'escape'
  | 'focus-next'
  | 'focus-previous'
  | 'extend-next'
  | 'extend-previous'
  | 'toggle'
  | 'delete'
  | 'rename'
  | 'select-all';

export interface KeyInput {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/** Ctrl means Cmd on macOS. */
export function keyCommand(event: KeyInput, context: { typing: boolean; onButton: boolean }): KeyCommand | null {
  if (event.key === 'Escape') return 'escape';
  if (context.typing || event.altKey) return null;
  if (event.ctrlKey || event.metaKey) return event.key.toLowerCase() === 'a' ? 'select-all' : null;
  switch (event.key) {
    case 'ArrowDown':
      return event.shiftKey ? 'extend-next' : 'focus-next';
    case 'ArrowUp':
      return event.shiftKey ? 'extend-previous' : 'focus-previous';
    case ' ':
      return context.onButton ? null : 'toggle'; // Space on a focused button presses that button
    case 'Delete':
    case 'Backspace':
      return 'delete';
    case 'F2':
      return 'rename';
    default:
      return null;
  }
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function isButtonTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'BUTTON' || ['button', 'switch', 'menuitem', 'menuitemcheckbox', 'checkbox'].includes(target.getAttribute('role') ?? '');
}
