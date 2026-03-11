import type { PieceState } from '../../api/details';

export interface PieceSegment {
  start: number;
  end: number;
  kind: 'done' | 'partial';
}

/** Runs to draw on the piece map, as fractions of its width. Missing pieces are left as trough. */
export function pieceSegments(states: readonly PieceState[], buckets = 300): PieceSegment[] {
  const count = Math.min(states.length, buckets);
  const segments: PieceSegment[] = [];
  for (let b = 0; b < count; b++) {
    const from = Math.floor((b * states.length) / count);
    const to = Math.floor(((b + 1) * states.length) / count);
    let done = 0;
    let started = 0;
    for (let i = from; i < to; i++) {
      if (states[i] === 2) done++;
      else if (states[i] === 1) started++;
    }
    const kind = done === to - from ? 'done' : done + started > 0 ? 'partial' : null;
    if (!kind) continue;
    const start = b / count;
    const end = (b + 1) / count;
    const last = segments.at(-1);
    if (last && last.kind === kind && Math.abs(last.end - start) < 1e-9) last.end = end;
    else segments.push({ start, end, kind });
  }
  return segments;
}
