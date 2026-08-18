import type { Torrent } from '../api/types';
import { parseTags } from '../lib/tags';

export interface Filters {
  search: string;
  /** null = all; '' = Uncategorized */
  category: string | null;
  /** null = all; '' = Untagged */
  tag: string | null;
  /** tracker host; null = all; '' = Trackerless */
  tracker: string | null;
}

export const NO_FILTERS: Filters = { search: '', category: null, tag: null, tracker: null };
/** The value that selects Uncategorized / Untagged / Trackerless. */
export const NONE = '';

export interface FacetItem {
  value: string;
  label: string;
  count: number;
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * The host of a tracker URL. Never falls back to the raw URL: private-tracker URLs carry the passkey in
 * their path, and this string is shown in the Tracker dropdown.
 */
export function hostOf(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host) return host;
  } catch {
    // malformed (e.g. a bad port): take the authority by hand below
  }
  const authority = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]+)/i.exec(url)?.[1];
  return authority || 'Unknown tracker';
}

/** hash → tracker hosts, from maindata's `trackers` (url → hashes). */
export function trackerHosts(trackers: ReadonlyMap<string, readonly string[]>): Map<string, Set<string>> {
  const byHash = new Map<string, Set<string>>();
  for (const [url, hashes] of trackers) {
    const host = hostOf(url);
    for (const hash of hashes) {
      const set = byHash.get(hash);
      if (set) set.add(host);
      else byHash.set(hash, new Set([host]));
    }
  }
  return byHash;
}

export function isFiltering(f: Filters): boolean {
  return f.search.trim() !== '' || f.category !== null || f.tag !== null || f.tracker !== null;
}

export function matches(t: Torrent, f: Filters, hosts: ReadonlyMap<string, ReadonlySet<string>>): boolean {
  return matcher(f, hosts)(t);
}

/** `matches` with the query normalized once, for testing many torrents against the same filters. */
export function matcher(f: Filters, hosts: ReadonlyMap<string, ReadonlySet<string>>): (t: Torrent) => boolean {
  const query = f.search.trim().toLocaleLowerCase();
  return (t) => passes(t, f, query, hosts);
}

function passes(t: Torrent, f: Filters, query: string, hosts: ReadonlyMap<string, ReadonlySet<string>>): boolean {
  if (query && !t.name.toLocaleLowerCase().includes(query)) return false;
  if (f.category !== null && t.category !== f.category) return false;
  if (f.tag !== null) {
    const tags = parseTags(t.tags);
    if (f.tag === NONE ? tags.length > 0 : !tags.includes(f.tag)) return false;
  }
  if (f.tracker !== null) {
    const own = hosts.get(t.hash);
    if (f.tracker === NONE ? own !== undefined && own.size > 0 : !own?.has(f.tracker)) return false;
  }
  return true;
}

export function categoryFacet(torrents: Iterable<Torrent>, categories: Iterable<string>): FacetItem[] {
  const counts = new Map<string, number>();
  for (const t of torrents) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  const names = [...new Set([...categories, ...[...counts.keys()].filter(Boolean)])].sort(byName);
  return [
    { value: NONE, label: 'Uncategorized', count: counts.get('') ?? 0 },
    ...names.map((name) => ({ value: name, label: name, count: counts.get(name) ?? 0 })),
  ];
}

export function tagFacet(torrents: Iterable<Torrent>, tags: Iterable<string>): FacetItem[] {
  const counts = new Map<string, number>();
  let untagged = 0;
  for (const t of torrents) {
    const own = parseTags(t.tags);
    if (own.length === 0) untagged++;
    for (const tag of own) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const names = [...new Set([...tags, ...counts.keys()])].sort(byName);
  return [{ value: NONE, label: 'Untagged', count: untagged }, ...names.map((name) => ({ value: name, label: name, count: counts.get(name) ?? 0 }))];
}

export function trackerFacet(torrents: Iterable<Torrent>, hosts: ReadonlyMap<string, ReadonlySet<string>>): FacetItem[] {
  const counts = new Map<string, number>();
  let trackerless = 0;
  for (const t of torrents) {
    const own = hosts.get(t.hash);
    if (!own || own.size === 0) trackerless++;
    else for (const host of own) counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  const sorted = [...counts].sort(([a, ca], [b, cb]) => cb - ca || byName(a, b));
  return [{ value: NONE, label: 'Trackerless', count: trackerless }, ...sorted.map(([host, count]) => ({ value: host, label: host, count }))];
}
