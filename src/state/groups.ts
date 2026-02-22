import type { Torrent, TorrentState } from '../api/types';

export type GroupKey = 'attention' | 'downloading' | 'queued' | 'seeding' | 'stopped';
export type StatusFilter = 'all' | 'downloading' | 'seeding' | 'stopped';

export const GROUP_ORDER: readonly GroupKey[] = ['attention', 'downloading', 'queued', 'seeding', 'stopped'];

export const GROUP_TITLES: Record<GroupKey, string> = {
  attention: 'Needs Attention',
  downloading: 'Downloading',
  queued: 'Queued',
  seeding: 'Seeding',
  stopped: 'Stopped',
};

export const STATUS_GROUPS: Record<StatusFilter, readonly GroupKey[]> = {
  all: GROUP_ORDER,
  downloading: ['attention', 'downloading', 'queued'],
  seeding: ['seeding'],
  stopped: ['stopped'],
};

/** Rows shown per group when several groups are visible. */
export const GROUP_LIMIT = 8;
/** Rows added per "Show More" when a single group is visible. */
export const PAGE_SIZE = 100;

const GROUP_BY_STATE: Partial<Record<TorrentState, GroupKey>> = {
  error: 'attention', missingFiles: 'attention',
  downloading: 'downloading', forcedDL: 'downloading', metaDL: 'downloading', forcedMetaDL: 'downloading',
  stalledDL: 'downloading', checkingDL: 'downloading',
  queuedDL: 'queued', queuedUP: 'queued',
  uploading: 'seeding', forcedUP: 'seeding', stalledUP: 'seeding', checkingUP: 'seeding',
  stoppedDL: 'stopped', stoppedUP: 'stopped',
};

/** `moving`, `checkingResumeData` and `unknown` fall back to progress. */
export function groupOf(t: Pick<Torrent, 'state' | 'progress'>): GroupKey {
  return GROUP_BY_STATE[t.state] ?? (t.progress >= 1 ? 'seeding' : 'downloading');
}

/**
 * Only stable distinctions rank (forced, fetching metadata, checking, moving). Pairs that flip
 * every few seconds on their own (downloading↔stalledDL, uploading↔stalledUP) share a rank,
 * otherwise rows would jump on routine sync ticks.
 */
const STATE_RANK: Partial<Record<TorrentState, number>> = {
  forcedDL: 0, downloading: 1, stalledDL: 1, forcedMetaDL: 2, metaDL: 2, checkingDL: 3, checkingResumeData: 3, moving: 4,
  forcedUP: 0, uploading: 1, stalledUP: 1, checkingUP: 2,
  error: 0, missingFiles: 1, queuedDL: 0, queuedUP: 1, stoppedDL: 0, stoppedUP: 1,
};

/**
 * Stable "Activity" order. It deliberately ignores live values (speeds), so rows never
 * move under the cursor on a sync tick.
 */
export function compareActivity(a: Torrent, b: Torrent): number {
  const rank = (STATE_RANK[a.state] ?? 9) - (STATE_RANK[b.state] ?? 9);
  if (rank !== 0) return rank;
  const qa = a.priority > 0 ? a.priority : Number.POSITIVE_INFINITY;
  const qb = b.priority > 0 ? b.priority : Number.POSITIVE_INFINITY;
  if (qa !== qb) return qa < qb ? -1 : 1;
  if (a.added_on !== b.added_on) return b.added_on - a.added_on;
  return a.name.localeCompare(b.name);
}

export interface GroupView {
  key: GroupKey;
  title: string;
  total: number;
  items: Torrent[];
  /** Torrents in the group not rendered (collapsed or beyond the limit). */
  hidden: number;
  collapsed: boolean;
  /** Every torrent in the group, sorted - including collapsed or truncated ones. */
  members: Torrent[];
}

export interface LayoutOptions {
  status: StatusFilter;
  libraryTotal: number;
  collapsed: Partial<Record<GroupKey, boolean>>;
  expanded: Partial<Record<GroupKey, number>>;
  compare?: (a: Torrent, b: Torrent) => number;
}

export function layoutGroups(torrents: Iterable<Torrent>, options: LayoutOptions): { single: boolean; groups: GroupView[] } {
  const allowed = STATUS_GROUPS[options.status];
  const buckets = new Map<GroupKey, Torrent[]>();
  for (const t of torrents) {
    const key = groupOf(t);
    if (!allowed.includes(key)) continue;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(t);
    else buckets.set(key, [t]);
  }
  const keys = GROUP_ORDER.filter((key) => buckets.has(key));
  const single = keys.length === 1 || options.status !== 'all';
  const compare = options.compare ?? compareActivity;

  const groups = keys.map((key): GroupView => {
    const sorted = buckets.get(key)!.sort(compare);
    const total = sorted.length;
    const collapsed =
      !single && (options.collapsed[key] ?? (key === 'stopped' && total > GROUP_LIMIT && options.libraryTotal > 25));
    const limit = options.expanded[key] ?? (single ? PAGE_SIZE : GROUP_LIMIT);
    const items = collapsed ? [] : sorted.slice(0, limit);
    return { key, title: GROUP_TITLES[key], total, items, members: sorted, hidden: total - items.length, collapsed };
  });
  return { single, groups };
}

/** The `expanded` value to store after the user presses "Show All" / "Show 100 More". */
export function expansionAfter(view: GroupView, single: boolean): number {
  return single ? view.items.length + PAGE_SIZE : Number.POSITIVE_INFINITY;
}
