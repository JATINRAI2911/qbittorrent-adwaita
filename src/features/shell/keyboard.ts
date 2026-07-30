export type KeyCommand =
  | 'escape'
  | 'focus-next'
  | 'focus-previous'
  | 'extend-next'
  | 'extend-previous'
  | 'toggle'
  | 'delete'
  | 'rename'
  | 'select-all'
  | 'search'
  | 'view-list'
  | 'view-table'
  | 'type'
  | 'open'
  | 'add'
  | 'preferences'
  | 'shortcuts';

export interface KeyInput {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** Auto-repeat from a held key. */
  repeat?: boolean;
  /** The physical key, e.g. 'Digit1' (Option+1 types “¡” on macOS). */
  code?: string;
}

/** Commands that must run once per press: holding Space, Delete or F2 should not repeat them. */
const ONCE: readonly KeyCommand[] = ['toggle', 'delete', 'rename'];

/** Ctrl means Cmd on macOS. */
export function keyCommand(event: KeyInput, context: { typing: boolean; onButton: boolean }): KeyCommand | null {
  const command = mapKey(event, context);
  return command && event.repeat && ONCE.includes(command) ? null : command;
}

function mapKey(event: KeyInput, context: { typing: boolean; onButton: boolean }): KeyCommand | null {
  if (event.key === 'Escape') return 'escape';
  if (context.typing) return null;
  if (event.altKey) {
    // Alt+1 / Alt+2 switch views like Ctrl/Cmd+1/2, which browsers keep for switching tabs.
    if (event.ctrlKey || event.metaKey || event.shiftKey) return null;
    if (event.code === 'Digit1') return 'view-list';
    if (event.code === 'Digit2') return 'view-table';
    return null;
  }
  if (event.ctrlKey || event.metaKey) {
    const key = event.key.toLowerCase();
    if (key === 'a') return 'select-all';
    if (key === 'f') return 'search';
    if (key === 'o') return 'add';
    if (key === ',') return 'preferences';
    if (event.key === '?' || (event.key === '/' && event.shiftKey)) return 'shortcuts';
    if (event.key === '1') return 'view-list';
    if (event.key === '2') return 'view-table';
    return null;
  }
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
    case 'Enter':
      return context.onButton ? null : 'open';
    default:
      // GNOME type-to-search: any printable character while nothing is focused.
      return [...event.key].length === 1 && !context.onButton ? 'type' : null;
  }
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function isButtonTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'BUTTON' || ['button', 'switch', 'menuitem', 'menuitemcheckbox', 'checkbox'].includes(target.getAttribute('role') ?? '');
}
