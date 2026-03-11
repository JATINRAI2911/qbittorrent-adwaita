import { describe, expect, it } from 'vitest';
import type { TorrentFile } from '../../src/api/details';
import { fileRows, priorityName, renamedPath, selectedSize } from '../../src/features/details/files';

const f = (index: number, name: string, size: number, priority = 1, progress = 1): TorrentFile => ({ index, name, size, priority, progress, piece_range: [0, 0], availability: 1 });

const season = [
  f(0, 'Show/S01/E01.mkv', 100, 1, 1),
  f(1, 'Show/S01/E02.mkv', 100, 0, 0),
  f(2, 'Show/Extras/Making Of.mkv', 50, 6, 0.5),
  f(3, 'Show/poster.jpg', 10, 1, 1),
];

const open = { collapsed: new Set<string>(), query: '' };

describe('priorityName', () => {
  it('maps qBittorrent priorities', () => {
    expect([0, 1, 4, 6, 7].map(priorityName)).toEqual(['skip', 'normal', 'normal', 'high', 'maximum']);
  });
});

describe('fileRows', () => {
  it('flattens folders first, with aggregates and tri-state checks', () => {
    const rows = fileRows(season, open);
    expect(rows.map((r) => `${'  '.repeat(r.depth)}${r.name}`)).toEqual([
      'Show',
      '  Extras',
      '    Making Of.mkv',
      '  S01',
      '    E01.mkv',
      '    E02.mkv',
      '  poster.jpg',
    ]);
    const show = rows[0]!;
    expect(show).toMatchObject({ kind: 'folder', path: 'Show', size: 260, check: 'mixed', priority: 'mixed' });
    expect(show.ids.sort()).toEqual([0, 1, 2, 3]);
    expect(show.progress).toBeCloseTo((100 + 0 + 25 + 10) / 260);
    expect(rows.find((r) => r.name === 'S01')).toMatchObject({ check: 'mixed', ids: [0, 1] });
    expect(rows.find((r) => r.name === 'Extras')).toMatchObject({ check: true, priority: 'high' });
    expect(rows.find((r) => r.name === 'E02.mkv')).toMatchObject({ kind: 'file', check: false, priority: 'skip', ids: [1] });
  });

  it('hides the children of collapsed folders', () => {
    const rows = fileRows(season, { collapsed: new Set(['Show/S01']), query: '' });
    expect(rows.map((r) => r.name)).toEqual(['Show', 'Extras', 'Making Of.mkv', 'S01', 'poster.jpg']);
  });

  it('filters by name, keeping the matches’ folders and ignoring collapse', () => {
    const rows = fileRows(season, { collapsed: new Set(['Show']), query: 'e02' });
    expect(rows.map((r) => r.name)).toEqual(['Show', 'S01', 'E02.mkv']);
  });

  it('shows a single-file torrent as one row', () => {
    expect(fileRows([f(0, 'ubuntu.iso', 5)], open)).toEqual([
      expect.objectContaining({ kind: 'file', name: 'ubuntu.iso', path: 'ubuntu.iso', depth: 0, check: true }),
    ]);
  });
});

describe('selectedSize and renamedPath', () => {
  it('sums the wanted files', () => {
    expect(selectedSize(season)).toBe(160);
  });

  it('renames the last path segment only', () => {
    expect(renamedPath('Show/S01/E01.mkv', 'Pilot.mkv')).toBe('Show/S01/Pilot.mkv');
    expect(renamedPath('ubuntu.iso', 'u.iso')).toBe('u.iso');
  });
});
