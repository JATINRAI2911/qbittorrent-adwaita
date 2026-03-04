import { describe, expect, it } from 'vitest';
import { scrollToReveal, virtualWindow } from '../../src/features/table/virtual';

describe('virtualWindow', () => {
  it('renders the visible rows plus overscan', () => {
    expect(virtualWindow({ scrollTop: 0, viewportHeight: 360, rowHeight: 36, count: 1000, overscan: 8 })).toEqual({ start: 0, end: 19, offset: 0, total: 36000 });
    expect(virtualWindow({ scrollTop: 3600, viewportHeight: 360, rowHeight: 36, count: 1000, overscan: 8 })).toEqual({ start: 92, end: 119, offset: 3312, total: 36000 });
  });

  it('clamps to the row count', () => {
    expect(virtualWindow({ scrollTop: 0, viewportHeight: 600, rowHeight: 36, count: 5 })).toMatchObject({ start: 0, end: 5 });
    expect(virtualWindow({ scrollTop: 99999, viewportHeight: 600, rowHeight: 36, count: 5 })).toMatchObject({ start: 5, end: 5 });
  });
});

describe('scrollToReveal', () => {
  const base = { viewportHeight: 330, rowHeight: 36, headerHeight: 30 };
  it('keeps the scroll position when the row is visible', () => {
    expect(scrollToReveal({ ...base, index: 3, scrollTop: 0 })).toBe(0);
  });
  it('scrolls up to a row above, and down to a row below the sticky header', () => {
    expect(scrollToReveal({ ...base, index: 2, scrollTop: 200 })).toBe(72);
    expect(scrollToReveal({ ...base, index: 20, scrollTop: 0 })).toBe(21 * 36 - 300);
  });
});
