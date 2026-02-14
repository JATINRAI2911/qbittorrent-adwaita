import { describe, expect, it } from 'vitest';
import { Selection, rangeBetween } from '../../src/state/selection.svelte';

const order = ['a', 'b', 'c', 'd', 'e'];
const plain = { shift: false, toggle: false };
const selectedOf = (s: Selection) => [...s.selected].sort();

describe('rangeBetween', () => {
  it('returns the inclusive range in list order, either direction', () => {
    expect(rangeBetween(order, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(order, 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(rangeBetween(order, 'x', 'b')).toEqual(['b']);
  });
});

describe('Selection.click', () => {
  it('selects a single row on a plain click, outside selection mode', () => {
    const s = new Selection();
    s.click('b', plain, order);
    s.click('c', plain, order);
    expect(selectedOf(s)).toEqual(['c']);
    expect(s.mode).toBe(false);
    expect(s.targets()).toEqual(['c']);
  });

  it('enters selection mode on Ctrl/Cmd-click, keeping the current row', () => {
    const s = new Selection();
    s.click('b', plain, order);
    s.click('d', { shift: false, toggle: true }, order);
    expect(s.mode).toBe(true);
    expect(selectedOf(s)).toEqual(['b', 'd']);
  });

  it('selects a range on Shift-click from the anchor', () => {
    const s = new Selection();
    s.click('b', plain, order);
    s.click('e', { shift: true, toggle: false }, order);
    expect(s.mode).toBe(true);
    expect(selectedOf(s)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('toggles rows with plain clicks while in selection mode', () => {
    const s = new Selection();
    s.enter();
    s.click('a', plain, order);
    s.click('c', plain, order);
    s.click('a', plain, order);
    expect(selectedOf(s)).toEqual(['c']);
  });
});

describe('Selection.moveFocus', () => {
  it('moves and single-selects outside selection mode, clamping at the ends', () => {
    const s = new Selection();
    expect(s.moveFocus(1, false, order)).toBe('a');
    s.moveFocus(-1, false, order);
    expect(s.focus).toBe('a');
    s.moveFocus(1, false, order);
    expect(selectedOf(s)).toEqual(['b']);
    expect(s.keyboard).toBe(true);
  });

  it('extends a range and enters selection mode with Shift', () => {
    const s = new Selection();
    s.moveFocus(1, false, order);
    s.moveFocus(1, true, order);
    s.moveFocus(1, true, order);
    expect(s.mode).toBe(true);
    expect(selectedOf(s)).toEqual(['a', 'b', 'c']);
  });

  it('only moves focus inside selection mode', () => {
    const s = new Selection();
    s.enter();
    s.moveFocus(1, false, order);
    s.moveFocus(1, false, order);
    expect(s.focus).toBe('b');
    expect(s.size).toBe(0);
  });

  it('returns null for an empty list', () => {
    expect(new Selection().moveFocus(1, false, [])).toBeNull();
  });
});

describe('Selection.prune', () => {
  it('drops vanished torrents and leaves selection mode when it empties', () => {
    const s = new Selection();
    s.selectAll(['a', 'b']);
    s.focus = 'a';
    s.prune((h) => h === 'b');
    expect(selectedOf(s)).toEqual(['b']);
    expect(s.focus).toBeNull();
    s.prune(() => false);
    expect(s.mode).toBe(false);
  });

  it('does not leave an intentionally empty selection mode', () => {
    const s = new Selection();
    s.enter();
    s.prune(() => false);
    expect(s.mode).toBe(true);
  });
});

describe('Selection.exit and clear', () => {
  it('exit leaves selection mode and empties the selection; clear empties without changing mode', () => {
    const s = new Selection();
    s.selectAll(['a', 'b']);
    s.exit();
    expect(s.mode).toBe(false);
    expect(s.size).toBe(0);
    s.click('a', plain, order);
    s.clear();
    expect(s.size).toBe(0);
    expect(s.focus).toBeNull();
  });
});
