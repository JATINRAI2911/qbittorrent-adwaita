import { SvelteMap } from 'svelte/reactivity';
import { describe, expect, it } from 'vitest';
import type { Torrent } from '../../src/api/types';
import type { TableSort } from '../../src/features/table/columns';
import { ListModel } from '../../src/features/list/list-model.svelte';
import { TableModel } from '../../src/features/table/table-model.svelte';
import { makeTorrent } from '../fixtures/torrents';

const live = (overrides: Partial<Torrent>) => {
  const t = $state(makeTorrent(overrides));
  return t;
};

describe('TableModel', () => {
  it('shows the list’s filtered torrents under its status filter, sorted by the table sort', () => {
    const a = live({ name: 'a', state: 'downloading', size: 30 });
    const b = live({ name: 'b', state: 'stalledUP', progress: 1, size: 10 });
    const c = live({ name: 'c', state: 'downloading', size: 20 });
    const list = new ListModel(new SvelteMap([a, b, c].map((t) => [t.hash, t] as const)));
    let sort = $state<TableSort>({ column: 'size', descending: true });
    const table = new TableModel(list, () => sort);
    expect(table.order).toEqual([a.hash, c.hash, b.hash]);
    sort = { column: 'name', descending: false };
    expect(table.order).toEqual([a.hash, b.hash, c.hash]);
    list.setStatus('downloading');
    expect(table.order).toEqual([a.hash, c.hash]);
    list.setFilters({ search: 'c' });
    expect(table.rows.map((t) => t.name)).toEqual(['c']);
  });

  it('does not re-sort on live ticks', () => {
    const a = live({ state: 'downloading', dlspeed: 100 });
    const b = live({ state: 'downloading', dlspeed: 50 });
    const map = new SvelteMap([[a.hash, a], [b.hash, b]]);
    const table = new TableModel(new ListModel(map), () => ({ column: 'down', descending: true }));
    expect(table.order).toEqual([a.hash, b.hash]);
    b.dlspeed = 900;
    expect(table.order).toEqual([a.hash, b.hash]);
    map.delete(a.hash);
    expect(table.order).toEqual([b.hash]);
  });

  it('remembers which row to reveal', () => {
    const table = new TableModel(new ListModel(new SvelteMap()));
    table.reveal('x');
    expect(table.revealHash).toBe('x');
  });
});
