import { describe, expect, it } from 'vitest';
import { isButtonTarget, isTypingTarget, keyCommand } from '../../src/features/shell/keyboard';

const key = (k: string, mods: Partial<{ shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean; repeat: boolean; code: string }> = {}) => ({
  key: k, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...mods,
});
const free = { typing: false, onButton: false };

describe('keyCommand', () => {
  it.each([
    ['o', { ctrlKey: true }, 'add'],
    [',', { ctrlKey: true }, 'preferences'],
    ['?', { ctrlKey: true, shiftKey: true }, 'shortcuts'],
    ['/', { metaKey: true, shiftKey: true }, 'shortcuts'],
    [',', { metaKey: true }, 'preferences'],
    ['O', { metaKey: true }, 'add'],
    ['ArrowDown', {}, 'focus-next'],
    ['ArrowUp', {}, 'focus-previous'],
    ['ArrowDown', { shiftKey: true }, 'extend-next'],
    ['ArrowUp', { shiftKey: true }, 'extend-previous'],
    [' ', {}, 'toggle'],
    ['Delete', {}, 'delete'],
    ['Backspace', {}, 'delete'],
    ['F2', {}, 'rename'],
    ['a', { ctrlKey: true }, 'select-all'],
    ['A', { metaKey: true }, 'select-all'],
    ['Escape', {}, 'escape'],
    ['Enter', {}, 'open'],
    ['f', { ctrlKey: true }, 'search'],
    ['F', { metaKey: true }, 'search'],
    ['1', { ctrlKey: true }, 'view-list'],
    ['2', { metaKey: true }, 'view-table'],
    ['u', {}, 'type'],
    ['É', {}, 'type'],
  ] as const)('%s %j → %s', (k, mods, expected) => expect(keyCommand(key(k, mods), free)).toBe(expected));

  it('switches views with Alt+1 / Alt+2 too (Ctrl/Cmd+1/2 switch browser tabs), by key position', () => {
    expect(keyCommand(key('1', { altKey: true, code: 'Digit1' }), free)).toBe('view-list');
    // macOS: Option+1 types “¡”, Option+2 “™”.
    expect(keyCommand(key('¡', { altKey: true, code: 'Digit1' }), free)).toBe('view-list');
    expect(keyCommand(key('™', { altKey: true, code: 'Digit2' }), free)).toBe('view-table');
    expect(keyCommand(key('1', { altKey: true, ctrlKey: true, code: 'Digit1' }), free)).toBeNull();
  });

  it('does not repeat toggle, delete or rename while the key is held', () => {
    for (const k of [' ', 'Delete', 'Backspace', 'F2']) expect(keyCommand(key(k, { repeat: true }), free)).toBeNull();
    expect(keyCommand(key('ArrowDown', { repeat: true }), free)).toBe('focus-next');
    // A held Esc would otherwise walk the whole cascade (menu, dialog, search, selection, sheet).
    expect(keyCommand(key('Escape', { repeat: true }), free)).toBeNull();
  });

  it('ignores everything but Escape while typing', () => {
    for (const k of [' ', 'Backspace', 'Delete', 'ArrowDown', 'F2']) expect(keyCommand(key(k), { typing: true, onButton: false })).toBeNull();
    expect(keyCommand(key('a', { ctrlKey: true }), { typing: true, onButton: false })).toBeNull();
    expect(keyCommand(key('Escape'), { typing: true, onButton: false })).toBe('escape');
  });

  it('leaves Space to a focused button', () => {
    expect(keyCommand(key(' '), { typing: false, onButton: true })).toBeNull();
    expect(keyCommand(key('ArrowDown'), { typing: false, onButton: true })).toBe('focus-next');
  });

  it('ignores Alt chords, unrelated Ctrl chords and non-printable keys', () => {
    expect(keyCommand(key('ArrowDown', { altKey: true }), free)).toBeNull();
    expect(keyCommand(key('u', { altKey: true }), free)).toBeNull();
    expect(keyCommand(key('c', { ctrlKey: true }), free)).toBeNull();
    expect(keyCommand(key('Tab'), free)).toBeNull();
  });

  it('starts type-to-search only when nothing is focused', () => {
    expect(keyCommand(key('u'), { typing: true, onButton: false })).toBeNull();
    expect(keyCommand(key('u'), { typing: false, onButton: true })).toBeNull();
    expect(keyCommand(key('f', { ctrlKey: true }), { typing: true, onButton: false })).toBeNull();
  });
});

describe('targets', () => {
  it('recognises typing and button targets', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('select'))).toBe(true);
    expect(isTypingTarget(document.createElement('div'))).toBe(false);
    expect(isButtonTarget(document.createElement('button'))).toBe(true);
    const custom = document.createElement('div');
    custom.setAttribute('role', 'switch');
    expect(isButtonTarget(custom)).toBe(true);
  });
});
