import { describe, expect, it } from 'vitest';
import { placePopover } from '../../src/ui/adw/position';

const viewport = { width: 1000, height: 800 };
const size = { width: 200, height: 100 };

describe('placePopover', () => {
  it('centres just below an anchor, like a dropdown, with no arrow', () => {
    expect(placePopover({ anchor: { left: 400, top: 50, width: 40, height: 34 }, size, viewport })).toEqual({ left: 320, top: 90, above: false, maxHeight: null });
  });

  it('aligns to the anchor end', () => {
    expect(placePopover({ anchor: { left: 900, top: 10, width: 34, height: 34 }, size, viewport, align: 'end' })).toMatchObject({ left: 734 });
  });

  it('flips above when there is no room below', () => {
    expect(placePopover({ anchor: { left: 400, top: 740, width: 40, height: 34 }, size, viewport })).toMatchObject({ top: 634, above: true });
  });

  it('clamps inside the viewport margin', () => {
    const placed = placePopover({ anchor: { left: 2, top: 10, width: 20, height: 20 }, size, viewport });
    expect(placed.left).toBe(8);
  });

  it('places context menus at the pointer, flipping left and up near the edges', () => {
    expect(placePopover({ anchor: { x: 100, y: 100 }, size, viewport })).toEqual({ left: 100, top: 100, above: false, maxHeight: null });
    expect(placePopover({ anchor: { x: 950, y: 780 }, size, viewport })).toMatchObject({ left: 750, top: 680 });
  });

  it('uses the roomier side and caps the height when a tall menu fits neither above nor below', () => {
    const tall = { width: 220, height: 780 };
    expect(placePopover({ anchor: { left: 400, top: 752, width: 80, height: 34 }, size: tall, viewport })).toMatchObject({ top: 8, above: true, maxHeight: 738 });
    expect(placePopover({ anchor: { left: 400, top: 20, width: 80, height: 34 }, size: tall, viewport })).toMatchObject({ top: 60, above: false, maxHeight: 732 });
  });

  it('caps pointer menus taller than the viewport', () => {
    expect(placePopover({ anchor: { x: 100, y: 600 }, size: { width: 200, height: 900 }, viewport })).toMatchObject({ top: 8, maxHeight: 784 });
  });
});
