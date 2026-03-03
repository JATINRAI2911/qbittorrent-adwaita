import { describe, expect, it } from 'vitest';
import type { TorrentState } from '../../src/api/types';
import { GROUP_LIMIT, LIST_SORTS, PAGE_SIZE, compareActivity, compareBy, expansionAfter, groupOf, layoutGroups, type LayoutOptions } from '../../src/state/groups';
import { makeTorrent } from '../fixtures/torrents';

const base: LayoutOptions = { status: 'all', libraryTotal: 100, collapsed: {}, expanded: {} };
const many = (n: number, state: TorrentState, progress = state.endsWith('UP') || state === 'uploading' ? 1 : 0.5) =>
  Array.from({ length: n }, () => makeTorrent({ state, progress }));

describe('groupOf', () => {
  it.each<[TorrentState, number, string]>([
    ['error', 0.3, 'attention'], ['missingFiles', 1, 'attention'],
    ['downloading', 0.5, 'downloading'], ['forcedDL', 0.5, 'downloading'], ['metaDL', 0, 'downloading'],
    ['forcedMetaDL', 0, 'downloading'], ['stalledDL', 0.5, 'downloading'], ['checkingDL', 0.5, 'downloading'],
    ['queuedDL', 0, 'queued'], ['queuedUP', 1, 'queued'],
    ['uploading', 1, 'seeding'], ['forcedUP', 1, 'seeding'], ['stalledUP', 1, 'seeding'], ['checkingUP', 1, 'seeding'],
    ['stoppedDL', 0.4, 'stopped'], ['stoppedUP', 1, 'stopped'],
    ['moving', 0.5, 'downloading'], ['moving', 1, 'seeding'],
    ['checkingResumeData', 0.2, 'downloading'], ['checkingResumeData', 1, 'seeding'],
    ['unknown', 0.2, 'downloading'], ['unknown', 1, 'seeding'],
  ])('%s at progress %d → %s', (state, progress, group) => expect(groupOf({ state, progress })).toBe(group));
});

describe('compareActivity', () => {
  it('orders by state rank, then queue position, then newest first', () => {
    const forced = makeTorrent({ state: 'forcedDL', added_on: 1 });
    const stalled = makeTorrent({ state: 'stalledDL', added_on: 9 });
    const q2 = makeTorrent({ state: 'downloading', priority: 2, added_on: 1 });
    const q1 = makeTorrent({ state: 'downloading', priority: 1, added_on: 1 });
    const unqueuedNew = makeTorrent({ state: 'downloading', priority: 0, added_on: 50 });
    const unqueuedOld = makeTorrent({ state: 'downloading', priority: 0, added_on: 40 });
    const sorted = [stalled, unqueuedOld, q2, forced, unqueuedNew, q1].sort(compareActivity);
    expect(sorted).toEqual([forced, q1, q2, unqueuedNew, unqueuedOld, stalled]);
  });
  it('keeps order when a torrent flips between active and stalled (live ticks never reorder rows)', () => {
    const a = makeTorrent({ state: 'uploading', progress: 1, added_on: 30 });
    const b = makeTorrent({ state: 'stalledUP', progress: 1, added_on: 20 });
    const c = makeTorrent({ state: 'uploading', progress: 1, added_on: 10 });
    const before = [c, a, b].sort(compareActivity);
    b.state = 'uploading';
    a.state = 'stalledUP';
    expect([c, a, b].sort(compareActivity)).toEqual(before);

    const d = makeTorrent({ state: 'downloading', added_on: 5 });
    const e = makeTorrent({ state: 'stalledDL', added_on: 9 });
    const order = [d, e].sort(compareActivity);
    e.state = 'downloading';
    d.state = 'stalledDL';
    expect([d, e].sort(compareActivity)).toEqual(order);
  });
});

describe('layoutGroups', () => {
  it('exposes every member of a group, even when collapsed or truncated', () => {
    const { groups } = layoutGroups([...many(30, 'uploading'), ...many(10, 'stoppedUP')], base);
    expect(groups.find((g) => g.key === 'seeding')!.members).toHaveLength(30);
    expect(groups.find((g) => g.key === 'stopped')).toMatchObject({ collapsed: true, items: [] });
    expect(groups.find((g) => g.key === 'stopped')!.members).toHaveLength(10);
  });

  it('returns groups in fixed order, skipping empty ones', () => {
    const { groups } = layoutGroups([...many(1, 'uploading'), ...many(1, 'error'), ...many(1, 'downloading')], base);
    expect(groups.map((g) => g.key)).toEqual(['attention', 'downloading', 'seeding']);
    expect(groups[0]!.title).toBe('Needs Attention');
  });

  it('truncates each group to 8 rows when several groups are visible', () => {
    const { single, groups } = layoutGroups([...many(30, 'uploading'), ...many(2, 'downloading')], base);
    expect(single).toBe(false);
    const seeding = groups.find((g) => g.key === 'seeding')!;
    expect(seeding).toMatchObject({ total: 30, hidden: 30 - GROUP_LIMIT, collapsed: false });
    expect(seeding.items).toHaveLength(GROUP_LIMIT);
  });

  it('collapses Stopped by default only when it has more than 8 items and the library has more than 25', () => {
    const stopped = [...many(9, 'stoppedUP'), ...many(1, 'downloading')];
    expect(layoutGroups(stopped, { ...base, libraryTotal: 26 }).groups.find((g) => g.key === 'stopped')!.collapsed).toBe(true);
    expect(layoutGroups(stopped, { ...base, libraryTotal: 25 }).groups.find((g) => g.key === 'stopped')!.collapsed).toBe(false);
    const eight = [...many(8, 'stoppedUP'), ...many(1, 'downloading')];
    expect(layoutGroups(eight, base).groups.find((g) => g.key === 'stopped')!.collapsed).toBe(false);
  });

  it('respects explicit collapse and expansion choices', () => {
    const list = [...many(9, 'stoppedUP'), ...many(12, 'uploading')];
    const { groups } = layoutGroups(list, { ...base, collapsed: { stopped: false, seeding: true }, expanded: { stopped: Infinity } });
    const stoppedGroup = groups.find((g) => g.key === 'stopped')!;
    expect(stoppedGroup.collapsed).toBe(false);
    expect(stoppedGroup.items).toHaveLength(9);
    expect(groups.find((g) => g.key === 'seeding')).toMatchObject({ collapsed: true, items: [], hidden: 12 });
  });

  it('shows 100 at a time when only one group is visible and never collapses it', () => {
    const { single, groups } = layoutGroups(many(250, 'stoppedUP'), base);
    expect(single).toBe(true);
    expect(groups[0]).toMatchObject({ collapsed: false, hidden: 150 });
    expect(groups[0]!.items).toHaveLength(PAGE_SIZE);
  });

  it('maps status filters to groups', () => {
    const list = [...many(1, 'error'), ...many(1, 'downloading'), ...many(1, 'queuedDL'), ...many(1, 'uploading'), ...many(1, 'stoppedDL')];
    const keys = (status: LayoutOptions['status']) => layoutGroups(list, { ...base, status }).groups.map((g) => g.key);
    expect(keys('downloading')).toEqual(['attention', 'downloading', 'queued']);
    expect(keys('seeding')).toEqual(['seeding']);
    expect(keys('stopped')).toEqual(['stopped']);
    expect(layoutGroups(list, { ...base, status: 'downloading' }).single).toBe(true);
  });
});

describe('expansionAfter', () => {
  it('shows everything in multi-group mode and one more page in single-group mode', () => {
    const { groups } = layoutGroups(many(250, 'stoppedUP'), base);
    expect(expansionAfter(groups[0]!, true)).toBe(200);
    expect(expansionAfter(groups[0]!, false)).toBe(Infinity);
  });
});

describe('compareBy', () => {
  const a = makeTorrent({ name: 'file 10', added_on: 5, size: 100, progress: 0.2, ratio: 3 });
  const b = makeTorrent({ name: 'File 9', added_on: 9, size: 300, progress: 0.9, ratio: 1 });
  const order = (sort: Parameters<typeof compareBy>[0]) => [a, b].sort(compareBy(sort)).map((t) => t.name);

  it('offers the six list sorts, Activity first', () => {
    expect(LIST_SORTS.map((s) => s.label)).toEqual(['Activity', 'Name', 'Date Added', 'Size', 'Progress', 'Ratio']);
  });

  it('sorts names naturally and case-insensitively', () => {
    expect(order('name')).toEqual(['File 9', 'file 10']);
  });

  it('sorts dates, sizes, progress and ratio largest first', () => {
    expect(order('added')).toEqual(['File 9', 'file 10']);
    expect(order('size')).toEqual(['File 9', 'file 10']);
    expect(order('progress')).toEqual(['File 9', 'file 10']);
    expect(order('ratio')).toEqual(['file 10', 'File 9']);
  });

  it('uses the stable activity order by default', () => {
    expect(compareBy('activity')).toBe(compareActivity);
  });
});
