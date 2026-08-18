import { SvelteMap } from 'svelte/reactivity';
import { describe, expect, it, vi } from 'vitest';
import type { Torrent } from '../../src/api/types';
import { ListModel } from '../../src/features/list/list-model.svelte';
import type { ListSort } from '../../src/state/groups';
import { makeTorrent } from '../fixtures/torrents';

const live = (overrides: Partial<Torrent>) => {
  const t = $state(makeTorrent(overrides));
  return t;
};

describe('ListModel filters', () => {
  it('reads tracker hosts only while a tracker filter is set', () => {
    const a = live({ name: 'Ubuntu', state: 'downloading' });
    const hosts = vi.fn(() => new Map([[a.hash, new Set(['t.example'])]]));
    const model = new ListModel(new SvelteMap([[a.hash, a]]), { hosts });
    model.setFilters({ search: 'ubu' });
    expect(model.matching).toHaveLength(1);
    expect(hosts).not.toHaveBeenCalled();
    model.setFilters({ tracker: 't.example' });
    expect(model.matching).toHaveLength(1);
    expect(hosts).toHaveBeenCalled();
  });

  it('filters by search, category, tag and tracker, and reports that it is filtering', () => {
    const a = live({ name: 'Ubuntu', category: 'ISOs', state: 'downloading' });
    const b = live({ name: 'Debian', category: '', state: 'downloading' });
    const hosts = new Map([[a.hash, new Set(['t.example'])]]);
    const model = new ListModel(new SvelteMap([[a.hash, a], [b.hash, b]]), { hosts: () => hosts });
    expect(model.filtering).toBe(false);
    model.setFilters({ search: 'ubu' });
    expect(model.order).toEqual([a.hash]);
    expect(model.filtering).toBe(true);
    model.setFilters({ search: '', category: '' });
    expect(model.order).toEqual([b.hash]);
    model.setFilters({ category: null, tracker: 't.example' });
    expect(model.matching.map((t) => t.hash)).toEqual([a.hash]);
    model.clearFilters();
    expect(model.filtering).toBe(false);
    expect(model.order).toHaveLength(2);
  });

  it('resets Show All expansion when a filter or the status changes', () => {
    const seeds = Array.from({ length: 12 }, () => live({ state: 'stalledUP', progress: 1 }));
    const failing = live({ state: 'error' });
    const model = new ListModel(new SvelteMap([...seeds, failing].map((t) => [t.hash, t] as const)));
    model.expand(model.layout.groups.find((g) => g.key === 'seeding')!);
    expect(model.expanded.seeding).toBe(Number.POSITIVE_INFINITY);
    model.setFilters({ search: '' });
    expect(model.expanded).toEqual({});
    model.expand(model.layout.groups.find((g) => g.key === 'seeding')!);
    model.setStatus('seeding');
    expect(model.expanded).toEqual({});
    expect(model.filtering).toBe(true);
  });

  it('opens search with a focus request and clears the text when closing', () => {
    const model = new ListModel(new SvelteMap());
    model.openSearch();
    expect(model.searchOpen).toBe(true);
    expect(model.searchFocus).toEqual({ n: 1, select: true });
    model.openSearch(false);
    expect(model.searchFocus).toEqual({ n: 2, select: false });
    model.setFilters({ search: 'x' });
    model.closeSearch();
    expect([model.searchOpen, model.filters.search]).toEqual([false, '']);
  });

  it('changes its filterKey whenever the filters or status change', () => {
    const model = new ListModel(new SvelteMap());
    const first = model.filterKey;
    model.setFilters({ tag: 'keep' });
    const second = model.filterKey;
    model.setStatus('stopped');
    expect(new Set([first, second, model.filterKey]).size).toBe(3);
  });
});

describe('ListModel sort', () => {
  it('sorts groups by the sort source', () => {
    // Activity (the default) puts the newer one first; each sort below gives a different order.
    const a = live({ name: 'z-name', state: 'downloading', progress: 0.2, added_on: 2 });
    const b = live({ name: 'y-name', state: 'downloading', progress: 0.5, added_on: 1 });
    let sort = $state<ListSort>('name');
    const model = new ListModel(new SvelteMap([[a.hash, a], [b.hash, b]]), { sort: () => sort });
    expect(model.order).toEqual([b.hash, a.hash]);
    sort = 'added';
    expect(model.order).toEqual([a.hash, b.hash]);
    sort = 'progress';
    expect(model.order).toEqual([b.hash, a.hash]);
  });

  it('never reorders rows on a live tick, only when membership changes', () => {
    const a = live({ state: 'downloading', progress: 0.2 });
    const b = live({ state: 'downloading', progress: 0.5 });
    const map = new SvelteMap([[a.hash, a], [b.hash, b]]);
    const model = new ListModel(map, { sort: () => 'progress' });
    expect(model.order).toEqual([b.hash, a.hash]);
    a.progress = 0.9;
    expect(model.order).toEqual([b.hash, a.hash]);
    const c = live({ state: 'downloading', progress: 0.1 });
    map.set(c.hash, c);
    expect(model.order).toEqual([a.hash, b.hash, c.hash]);
  });

  it('does not reorder when an unrelated torrent flips between downloading and stalled', () => {
    const a = live({ state: 'downloading', progress: 0.2 });
    const b = live({ state: 'downloading', progress: 0.5 });
    const other = live({ state: 'downloading', progress: 0 });
    const model = new ListModel(new SvelteMap([a, b, other].map((t) => [t.hash, t] as const)), { sort: () => 'progress' });
    expect(model.order).toEqual([b.hash, a.hash, other.hash]);
    a.progress = 0.9;
    other.state = 'stalledDL';
    expect(model.order).toEqual([b.hash, a.hash, other.hash]);
  });

  it('follows queue moves under the Activity sort', () => {
    const q1 = live({ state: 'queuedDL', priority: 1 });
    const q2 = live({ state: 'queuedDL', priority: 2 });
    const q3 = live({ state: 'queuedDL', priority: 3 });
    const model = new ListModel(new SvelteMap([q1, q2, q3].map((t) => [t.hash, t] as const)));
    expect(model.order).toEqual([q1.hash, q2.hash, q3.hash]);
    // "Move to Top" on q3: qBittorrent renumbers without any state change.
    q3.priority = 1;
    q1.priority = 2;
    q2.priority = 3;
    expect(model.order).toEqual([q3.hash, q1.hash, q2.hash]);
  });

  it('re-sorts right away when a torrent is renamed under the Name sort', () => {
    const a = live({ name: 'a', state: 'downloading' });
    const b = live({ name: 'b', state: 'downloading' });
    const model = new ListModel(new SvelteMap([[a.hash, a], [b.hash, b]]), { sort: () => 'name' });
    expect(model.order).toEqual([a.hash, b.hash]);
    a.name = 'z';
    expect(model.order).toEqual([b.hash, a.hash]);
  });
});
