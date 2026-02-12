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
  /** Space between anchor and popover, room for the arrow. */
  gap?: number;
  /** Minimum distance from the viewport edges. */
  margin?: number;
}
export interface Placement {
  left: number;
  top: number;
  above: boolean;
  /** Arrow position from the popover's left edge; null for pointer-anchored (context) menus. */
  arrowX: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));
const isRect = (anchor: Rect | Point): anchor is Rect => 'width' in anchor;

export function placePopover({ anchor, size, viewport, align = 'center', gap = 10, margin = 8 }: PlaceInput): Placement {
  if (!isRect(anchor)) {
    const left = anchor.x + size.width > viewport.width - margin ? anchor.x - size.width : anchor.x;
    const top = anchor.y + size.height > viewport.height - margin ? anchor.y - size.height : anchor.y;
    return {
      left: clamp(left, margin, viewport.width - size.width - margin),
      top: clamp(top, margin, viewport.height - size.height - margin),
      above: false,
      arrowX: null,
    };
  }
  const below = anchor.top + anchor.height + gap;
  const above = below + size.height > viewport.height - margin && anchor.top - gap - size.height >= margin;
  const top = above ? anchor.top - gap - size.height : below;
  const raw =
    align === 'start' ? anchor.left : align === 'end' ? anchor.left + anchor.width - size.width : anchor.left + anchor.width / 2 - size.width / 2;
  const left = clamp(raw, margin, viewport.width - size.width - margin);
  const arrowX = clamp(anchor.left + anchor.width / 2 - left, 18, size.width - 18);
  return { left, top, above, arrowX };
}
