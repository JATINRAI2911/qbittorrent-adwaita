export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface PlaceInput {
  anchor: Rect | Point;
  size: { width: number; height: number };
  viewport: { width: number; height: number };
  align?: 'start' | 'center' | 'end';
  /** Space between anchor and popover (no arrow: popovers are plain cards, like dropdowns). */
  gap?: number;
  /** Minimum distance from the viewport edges. */
  margin?: number;
}
export interface Placement {
  left: number;
  top: number;
  above: boolean;
  /** Set when the content doesn't fit: the popover scrolls within this height. */
  maxHeight: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));
const isRect = (anchor: Rect | Point): anchor is Rect => 'width' in anchor;

export function placePopover({ anchor, size, viewport, align = 'center', gap = 6, margin = 8 }: PlaceInput): Placement {
  if (!isRect(anchor)) {
    const room = viewport.height - 2 * margin;
    const height = Math.min(size.height, room);
    const left = anchor.x + size.width > viewport.width - margin ? anchor.x - size.width : anchor.x;
    const top = anchor.y + height > viewport.height - margin ? anchor.y - height : anchor.y;
    return {
      left: clamp(left, margin, viewport.width - size.width - margin),
      top: clamp(top, margin, viewport.height - height - margin),
      above: false,
      maxHeight: size.height > room ? room : null,
    };
  }
  const below = anchor.top + anchor.height + gap;
  const roomBelow = viewport.height - margin - below;
  const roomAbove = anchor.top - gap - margin;
  let above = false;
  let maxHeight: number | null = null;
  if (size.height > roomBelow) {
    if (size.height <= roomAbove) above = true;
    else if (roomAbove > roomBelow) [above, maxHeight] = [true, roomAbove];
    else maxHeight = roomBelow;
  }
  const height = maxHeight ?? size.height;
  const top = above ? anchor.top - gap - height : below;
  const raw =
    align === 'start' ? anchor.left : align === 'end' ? anchor.left + anchor.width - size.width : anchor.left + anchor.width / 2 - size.width / 2;
  const left = clamp(raw, margin, viewport.width - size.width - margin);
  return { left, top, above, maxHeight };
}
