export interface VirtualWindow {
  start: number;
  end: number;
  /** translateY of the first rendered row, px */
  offset: number;
  /** full body height, px */
  total: number;
}

export function virtualWindow({
  scrollTop,
  viewportHeight,
  rowHeight,
  count,
  overscan = 8,
}: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  count: number;
  overscan?: number;
}): VirtualWindow {
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const visible = Math.ceil(viewportHeight / rowHeight) + 1;
  const start = Math.min(count, Math.max(0, first - overscan));
  const end = Math.max(start, Math.min(count, first + visible + overscan));
  return { start, end, offset: start * rowHeight, total: count * rowHeight };
}

/** The scrollTop that brings row `index` fully into view below a sticky header. */
export function scrollToReveal({
  index,
  scrollTop,
  viewportHeight,
  rowHeight,
  headerHeight = 0,
}: {
  index: number;
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  headerHeight?: number;
}): number {
  const top = index * rowHeight;
  const bottom = top + rowHeight;
  const body = viewportHeight - headerHeight;
  if (top < scrollTop) return top;
  if (bottom > scrollTop + body) return bottom - body;
  return scrollTop;
}
