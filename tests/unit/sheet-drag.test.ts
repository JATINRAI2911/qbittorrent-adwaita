import { describe, expect, it } from 'vitest';
import { SHEET_COLLAPSE, dragFraction, settleSheet } from '../../src/ui/adw/sheet-drag';

describe('sheet drag', () => {
  it('grows when dragged up and shrinks when dragged down', () => {
    expect(dragFraction(0.5, 500, 300, 1000)).toBeCloseTo(0.7);
    expect(dragFraction(0.5, 500, 700, 1000)).toBeCloseTo(0.3);
    expect(dragFraction(0.9, 500, 0, 1000)).toBe(1);
    expect(dragFraction(0.2, 500, 900, 1000)).toBe(0);
  });

  it('collapses below 25 % and clamps to 22–92 % otherwise', () => {
    expect(SHEET_COLLAPSE).toBe(0.25);
    expect(settleSheet(0.24)).toEqual({ collapse: true, fraction: 0.24 });
    expect(settleSheet(0.3)).toEqual({ collapse: false, fraction: 0.3 });
    expect(settleSheet(0.99)).toEqual({ collapse: false, fraction: 0.92 });
  });
});
