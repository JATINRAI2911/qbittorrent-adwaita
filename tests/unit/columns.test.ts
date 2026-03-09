import { describe, expect, it } from 'vitest';
import {
  COLUMN_IDS,
  COLUMNS,
  connectedPeers,
  connectedSeeds,
  gridTemplate,
  gridMinWidth,
  isColumnId,
  peersText,
  sortRows,
  statusText,
} from '../../src/features/table/columns';
import { makeTorrent } from '../fixtures/torrents';

describe('columns', () => {
  it('has the thirteen columns in order, and Name is not hideable', () => {
    expect(COLUMN_IDS).toEqual(['name', 'status', 'progress', 'size', 'down', 'up', 'eta', 'seeds', 'peers', 'ratio', 'category', 'tags', 'added']);
    expect(isColumnId('ratio')).toBe(true);
    expect(isColumnId('nope')).toBe(false);
    expect(gridTemplate(['name', 'size'])).toBe(`${COLUMNS.name.width} ${COLUMNS.size.width}`);
  });

  it('shows connected (total) seeds and peers, with 0 connected when not transferring', () => {
    const active = makeTorrent({ state: 'downloading', num_seeds: 3, num_complete: 40, num_leechs: 2, num_incomplete: 9 });
    const stopped = makeTorrent({ state: 'stoppedDL', num_seeds: 3, num_complete: 40 });
    const fetching = makeTorrent({ state: 'metaDL', num_leechs: 4 });
    expect(peersText(connectedSeeds(active), active.num_complete)).toBe('3 (40)');
    expect(connectedPeers(active)).toBe(2);
    expect(connectedSeeds(stopped)).toBe(0);
    expect(connectedPeers(fetching)).toBe(0);
  });

  it('labels states in plain words', () => {
    expect(statusText(makeTorrent({ state: 'stalledUP' }))).toBe('Idle');
    expect(statusText(makeTorrent({ state: 'forcedDL' }))).toBe('Downloading (Forced)');
    expect(statusText(makeTorrent({ state: 'missingFiles' }))).toBe('Missing Files');
  });

  it('sorts by a column, reversing for descending and tie-breaking by name', () => {
    const a = makeTorrent({ name: 'a', size: 10 });
    const b = makeTorrent({ name: 'b', size: 30 });
    const c = makeTorrent({ name: 'c', size: 10 });
    expect(sortRows([b, c, a], { column: 'size', descending: false }).map((t) => t.name)).toEqual(['a', 'c', 'b']);
    expect(sortRows([b, c, a], { column: 'size', descending: true }).map((t) => t.name)).toEqual(['b', 'c', 'a']);
    expect(sortRows([b, c, a], { column: 'name', descending: false }).map((t) => t.name)).toEqual(['a', 'b', 'c']);
  });

  it('sizes the grid from the column minimums, independent of any name length', () => {
    // Name 260 + Size 90 + Ratio 70 + 12px of row padding.
    expect(gridMinWidth(['name', 'size', 'ratio'])).toBe(432);
    expect(COLUMNS.name.width).toBe('minmax(260px, 1fr)');
  });
});
