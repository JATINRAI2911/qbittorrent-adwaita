import { describe, expect, it, vi } from 'vitest';
import type { MaindataResponse } from '../../src/api/types';
import { applyMaindata, emptySyncState } from '../../src/sync/maindata';

const fullUpdate = (): MaindataResponse => ({
  rid: 1,
  full_update: true,
  torrents: {
    aaa: { name: 'ubuntu.iso', state: 'downloading', progress: 0.5, dlspeed: 100, size: 1000 },
    bbb: { name: 'debian.iso', state: 'stalledUP', progress: 1, size: 2000 },
  },
  categories: { ISOs: { name: 'ISOs', savePath: '/isos' } },
  tags: ['keep', 'archive'],
  trackers: { 'udp://t.example:1337/announce': ['aaa', 'bbb'] },
  server_state: { connection_status: 'connected', dl_info_speed: 100, dht_nodes: 400 },
});

describe('applyMaindata', () => {
  it('populates an empty state from a full update', () => {
    const state = emptySyncState();
    const summary = applyMaindata(state, fullUpdate());
    expect(state.rid).toBe(1);
    expect([...state.torrents.keys()]).toEqual(['aaa', 'bbb']);
    expect(state.torrents.get('aaa')).toMatchObject({ hash: 'aaa', name: 'ubuntu.iso', eta: 8_640_000, tags: '' });
    expect(state.categories.get('ISOs')).toEqual({ name: 'ISOs', savePath: '/isos' });
    expect([...state.tags]).toEqual(['keep', 'archive']);
    expect(state.trackers.get('udp://t.example:1337/announce')).toEqual(['aaa', 'bbb']);
    expect(state.server).toMatchObject({ connection_status: 'connected', dht_nodes: 400 });
    expect(summary).toEqual({ added: ['aaa', 'bbb'], removed: [], desync: false });
  });

  it('patches existing torrents in place, keeping object identity', () => {
    const state = emptySyncState();
    applyMaindata(state, fullUpdate());
    const before = state.torrents.get('aaa');
    applyMaindata(state, { rid: 2, torrents: { aaa: { dlspeed: 999, progress: 0.6 } } });
    const after = state.torrents.get('aaa');
    expect(after).toBe(before);
    expect(after).toMatchObject({ dlspeed: 999, progress: 0.6, name: 'ubuntu.iso' });
    expect(state.rid).toBe(2);
  });

  it('removes torrents listed in torrents_removed', () => {
    const state = emptySyncState();
    applyMaindata(state, fullUpdate());
    const summary = applyMaindata(state, { rid: 2, torrents_removed: ['bbb', 'unknown'] });
    expect([...state.torrents.keys()]).toEqual(['aaa']);
    expect(summary.removed).toEqual(['bbb']);
  });

  it('fills defaults for new torrents and passes them through create()', () => {
    const state = emptySyncState();
    applyMaindata(state, fullUpdate());
    const spy = vi.fn();
    const create = <T extends object>(value: T): T => {
      spy(value);
      return value;
    };
    const summary = applyMaindata(state, { rid: 2, torrents: { ccc: { name: 'new.iso', state: 'metaDL' } } }, create);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(state.torrents.get('ccc')).toMatchObject({ hash: 'ccc', name: 'new.iso', state: 'metaDL', progress: 0, size: 0 });
    expect(summary).toMatchObject({ added: ['ccc'], desync: false });
  });

  it('on full_update drops torrents the server no longer has but keeps identity of the rest (server restart)', () => {
    const state = emptySyncState();
    applyMaindata(state, fullUpdate());
    const survivor = state.torrents.get('aaa');
    const summary = applyMaindata(state, {
      rid: 1,
      full_update: true,
      torrents: { aaa: { name: 'ubuntu.iso', state: 'stoppedDL', progress: 0.5 } },
    });
    expect([...state.torrents.keys()]).toEqual(['aaa']);
    expect(state.torrents.get('aaa')).toBe(survivor);
    expect(state.torrents.get('aaa')?.state).toBe('stoppedDL');
    expect(summary.removed).toEqual(['bbb']);
    expect(state.categories.size).toBe(0);
    expect(state.tags.size).toBe(0);
    expect(state.trackers.size).toBe(0);
  });

  it('applies removals for categories, tags and trackers', () => {
    const state = emptySyncState();
    applyMaindata(state, fullUpdate());
    applyMaindata(state, {
      rid: 2,
      categories_removed: ['ISOs'],
      tags_removed: ['archive'],
      trackers_removed: ['udp://t.example:1337/announce'],
    });
    expect(state.categories.size).toBe(0);
    expect([...state.tags]).toEqual(['keep']);
    expect(state.trackers.size).toBe(0);
  });

  it('flags desync when a partial update patches a torrent it has never seen', () => {
    const state = emptySyncState();
    applyMaindata(state, fullUpdate());
    const summary = applyMaindata(state, { rid: 2, torrents: { zzz: { dlspeed: 5 } } });
    expect(summary.desync).toBe(true);
  });

  it('merges server_state on partial updates and replaces it on a full update', () => {
    const state = emptySyncState();
    applyMaindata(state, fullUpdate());
    applyMaindata(state, { rid: 2, server_state: { dl_info_speed: 7 } });
    expect(state.server).toMatchObject({ dl_info_speed: 7, dht_nodes: 400 });
    applyMaindata(state, { rid: 3, full_update: true, server_state: { dl_info_speed: 1 } });
    expect(state.server).toEqual({ dl_info_speed: 1 });
  });
});
