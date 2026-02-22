import { SvelteMap } from 'svelte/reactivity';
import { describe, expect, it } from 'vitest';
import type { Torrent } from '../../src/api/types';
import { ListModel } from '../../src/features/list/list-model.svelte';
import { makeTorrent } from '../fixtures/torrents';

function library() {
  const seeds = Array.from({ length: 12 }, (_, i) => makeTorrent({ state: 'stalledUP', progress: 1, added_on: 100 - i }));
  const stopped = Array.from({ length: 10 }, () => makeTorrent({ state: 'stoppedUP', progress: 1 }));
  const failing = makeTorrent({ state: 'error' });
  const extra = Array.from({ length: 5 }, () => makeTorrent({ state: 'stalledUP', progress: 1, added_on: 1 }));
  const map = new SvelteMap<string, Torrent>([...seeds, ...stopped, failing, ...extra].map((t) => [t.hash, t]));
  return { map, seeds, stopped, failing };
}

describe('ListModel', () => {
  it('orders rendered rows top to bottom and knows every visible hash', () => {
    const { map, seeds, stopped, failing } = library();
    const model = new ListModel(map);
    expect(model.order).toEqual([failing.hash, ...seeds.slice(0, 8).map((t) => t.hash)]);
    expect(model.allHashes).toHaveLength(1 + 17 + 10);
    expect(model.allHashes).toEqual(expect.arrayContaining(stopped.map((t) => t.hash)));
  });

  it('expands and collapses groups', () => {
    const { map, stopped } = library();
    const model = new ListModel(map);
    const stoppedGroup = model.layout.groups.find((g) => g.key === 'stopped')!;
    model.toggleCollapsed(stoppedGroup);
    const stoppedHashes = new Set(stopped.map((t) => t.hash));
    expect(model.order.filter((hash) => stoppedHashes.has(hash))).toHaveLength(8);
    const seeding = model.layout.groups.find((g) => g.key === 'seeding')!;
    model.expand(seeding);
    expect(model.layout.groups.find((g) => g.key === 'seeding')!.items).toHaveLength(17);
  });

  it('follows additions and removals in the torrent map', () => {
    const { map, failing } = library();
    const model = new ListModel(map);
    map.delete(failing.hash);
    expect(model.order).not.toContain(failing.hash);
    const fresh = makeTorrent({ state: 'downloading' });
    map.set(fresh.hash, fresh);
    expect(model.order[0]).toBe(fresh.hash);
  });
});
