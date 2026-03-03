import { SvelteMap } from 'svelte/reactivity';
import { describe, expect, it } from 'vitest';
import {
  NO_FILTERS,
  NONE,
  categoryFacet,
  hostOf,
  isFiltering,
  matches,
  tagFacet,
  trackerFacet,
  trackerHosts,
} from '../../src/state/filters';
import { TrackerIndex } from '../../src/state/tracker-index.svelte';
import { makeTorrent } from '../fixtures/torrents';

const noHosts = new Map<string, Set<string>>();

describe('hostOf and trackerHosts', () => {
  it('groups tracker URLs by host and survives malformed URLs', () => {
    expect(hostOf('https://tracker.example.org:443/a/PASSKEY/announce')).toBe('tracker.example.org');
    expect(hostOf('udp://open.demonii.com:1337/announce')).toBe('open.demonii.com');
    expect(hostOf('not a url')).toBe('not a url');
    const hosts = trackerHosts(
      new Map([
        ['https://t.example/a/announce', ['h1', 'h2']],
        ['https://t.example/b/announce', ['h1']],
        ['udp://other.example:80', ['h2']],
      ]),
    );
    expect([...hosts.get('h1')!]).toEqual(['t.example']);
    expect([...hosts.get('h2')!].sort()).toEqual(['other.example', 't.example']);
  });
});

describe('matches', () => {
  const hosts = new Map([['a', new Set(['t.example'])]]);
  const tv = makeTorrent({ hash: 'a', name: 'Ubuntu 24.04 Desktop', category: 'ISOs', tags: 'keep, long term' });
  const bare = makeTorrent({ hash: 'b', name: 'debian.iso', category: '', tags: '' });

  it('matches everything without filters', () => {
    expect(isFiltering(NO_FILTERS)).toBe(false);
    expect(matches(tv, NO_FILTERS, hosts)).toBe(true);
  });

  it('searches names case-insensitively and ignores surrounding spaces', () => {
    expect(matches(tv, { ...NO_FILTERS, search: '  ubuntu 24 ' }, hosts)).toBe(true);
    expect(matches(bare, { ...NO_FILTERS, search: 'ubuntu' }, hosts)).toBe(false);
    expect(isFiltering({ ...NO_FILTERS, search: '   ' })).toBe(false);
  });

  it('treats the empty value as Uncategorized / Untagged / Trackerless', () => {
    expect(matches(bare, { ...NO_FILTERS, category: NONE }, hosts)).toBe(true);
    expect(matches(tv, { ...NO_FILTERS, category: NONE }, hosts)).toBe(false);
    expect(matches(bare, { ...NO_FILTERS, tag: NONE }, hosts)).toBe(true);
    expect(matches(tv, { ...NO_FILTERS, tag: 'long term' }, hosts)).toBe(true);
    expect(matches(tv, { ...NO_FILTERS, tag: 'long' }, hosts)).toBe(false);
    expect(matches(bare, { ...NO_FILTERS, tracker: NONE }, hosts)).toBe(true);
    expect(matches(tv, { ...NO_FILTERS, tracker: 't.example' }, hosts)).toBe(true);
    expect(matches(tv, { ...NO_FILTERS, tracker: NONE }, hosts)).toBe(false);
  });

  it('combines filters with AND', () => {
    expect(matches(tv, { ...NO_FILTERS, category: 'ISOs', tag: 'keep', search: 'ubuntu' }, hosts)).toBe(true);
    expect(matches(tv, { ...NO_FILTERS, category: 'ISOs', tag: 'other' }, hosts)).toBe(false);
  });
});

describe('facets', () => {
  const torrents = [
    makeTorrent({ hash: 'a', category: 'Films', tags: 'keep, hd' }),
    makeTorrent({ hash: 'b', category: 'Films', tags: 'keep' }),
    makeTorrent({ hash: 'c', category: '', tags: '' }),
  ];

  it('lists Uncategorized first, then every category by name, including empty ones', () => {
    expect(categoryFacet(torrents, ['Linux', 'Films'])).toEqual([
      { value: NONE, label: 'Uncategorized', count: 1 },
      { value: 'Films', label: 'Films', count: 2 },
      { value: 'Linux', label: 'Linux', count: 0 },
    ]);
  });

  it('counts tags per torrent', () => {
    expect(tagFacet(torrents, ['keep', 'hd', 'unused'])).toEqual([
      { value: NONE, label: 'Untagged', count: 1 },
      { value: 'hd', label: 'hd', count: 1 },
      { value: 'keep', label: 'keep', count: 2 },
      { value: 'unused', label: 'unused', count: 0 },
    ]);
  });

  it('sorts trackers by count and counts a torrent once per host', () => {
    const hosts = new Map([
      ['a', new Set(['big.example', 'small.example'])],
      ['b', new Set(['big.example'])],
    ]);
    expect(trackerFacet(torrents, hosts)).toEqual([
      { value: NONE, label: 'Trackerless', count: 1 },
      { value: 'big.example', label: 'big.example', count: 2 },
      { value: 'small.example', label: 'small.example', count: 1 },
    ]);
    expect(trackerFacet(torrents, noHosts)[0]).toEqual({ value: NONE, label: 'Trackerless', count: 3 });
  });
});

describe('TrackerIndex', () => {
  it('follows the live trackers map', () => {
    const trackers = new SvelteMap<string, string[]>([['https://t.example/announce', ['h1']]]);
    const index = new TrackerIndex(trackers);
    expect([...index.byHash.get('h1')!]).toEqual(['t.example']);
    trackers.set('udp://u.example:1', ['h2']);
    expect([...index.byHash.get('h2')!]).toEqual(['u.example']);
  });
});
