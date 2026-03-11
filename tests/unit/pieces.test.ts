import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PieceMap from '../../src/features/details/PieceMap.svelte';
import { pieceSegments } from '../../src/features/details/pieces';

describe('pieceSegments', () => {
  it('merges runs of done and in-progress pieces, skipping missing ones', () => {
    expect(pieceSegments([2, 2, 0, 1, 1, 2])).toEqual([
      { start: 0, end: 2 / 6, kind: 'done' },
      { start: 3 / 6, end: 5 / 6, kind: 'partial' },
      { start: 5 / 6, end: 1, kind: 'done' },
    ]);
  });

  it('buckets large torrents: a bucket is done only when all its pieces are', () => {
    const states = [...Array(50).fill(2), ...Array(49).fill(0), 2];
    const segments = pieceSegments(states, 4);
    expect(segments[0]).toEqual({ start: 0, end: 0.5, kind: 'done' });
    expect(segments.at(-1)).toEqual({ start: 0.75, end: 1, kind: 'partial' });
  });

  it('returns nothing for no pieces', () => {
    expect(pieceSegments([])).toEqual([]);
  });
});

describe('PieceMap', () => {
  it('describes progress in words', () => {
    render(PieceMap, { states: [2, 0], have: 1, total: 2 });
    expect(screen.getByRole('img', { name: '1 of 2 pieces downloaded' })).toBeInTheDocument();
  });
});
