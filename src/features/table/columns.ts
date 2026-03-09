import type { Torrent, TorrentState } from '../../api/types';
import { formatCount } from '../../lib/format';

export type ColumnId = 'name' | 'status' | 'progress' | 'size' | 'down' | 'up' | 'eta' | 'seeds' | 'peers' | 'ratio' | 'category' | 'tags' | 'added';

export const COLUMN_IDS: readonly ColumnId[] = ['name', 'status', 'progress', 'size', 'down', 'up', 'eta', 'seeds', 'peers', 'ratio', 'category', 'tags', 'added'];
export const DEFAULT_COLUMNS: readonly ColumnId[] = COLUMN_IDS;

export const isColumnId = (value: unknown): value is ColumnId => typeof value === 'string' && (COLUMN_IDS as readonly string[]).includes(value);

export interface TableSort {
  column: ColumnId;
  descending: boolean;
}

export interface Column {
  id: ColumnId;
  title: string;
  /** CSS grid track size. */
  width: string;
  align?: 'end';
  /** Direction of the first click on this header. */
  defaultDescending: boolean;
  compare(a: Torrent, b: Torrent): number;
  /** For columns sorted by a value only people change (name, size…): the sort re-runs when it changes. Live columns leave it out. */
  stable?: (t: Torrent) => string;
}

const NOT_CONNECTED: ReadonlySet<TorrentState> = new Set<TorrentState>(['stoppedDL', 'stoppedUP', 'queuedDL', 'queuedUP', 'error', 'missingFiles', 'metaDL', 'forcedMetaDL']);

export const connectedSeeds = (t: Torrent) => (NOT_CONNECTED.has(t.state) ? 0 : t.num_seeds);
export const connectedPeers = (t: Torrent) => (NOT_CONNECTED.has(t.state) ? 0 : t.num_leechs);
export const peersText = (connected: number, total: number) => `${formatCount(connected)} (${formatCount(Math.max(0, total))})`;

const STATUS_LABEL: Record<TorrentState, string> = {
  error: 'Error',
  missingFiles: 'Missing Files',
  uploading: 'Seeding',
  stoppedUP: 'Stopped',
  queuedUP: 'Queued',
  stalledUP: 'Idle',
  checkingUP: 'Checking',
  forcedUP: 'Seeding (Forced)',
  downloading: 'Downloading',
  metaDL: 'Fetching Metadata',
  forcedMetaDL: 'Fetching Metadata',
  stoppedDL: 'Stopped',
  queuedDL: 'Queued',
  stalledDL: 'Stalled',
  checkingDL: 'Checking',
  forcedDL: 'Downloading (Forced)',
  checkingResumeData: 'Checking',
  moving: 'Moving',
  unknown: 'Unknown',
};
export const statusText = (t: Torrent) => STATUS_LABEL[t.state] ?? 'Unknown';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = (unix: number) => (unix > 0 ? dateFormat.format(unix * 1000) : '–');

const byNumber = (value: (t: Torrent) => number) => (a: Torrent, b: Torrent) => value(a) - value(b);
const byText = (value: (t: Torrent) => string) => (a: Torrent, b: Torrent) => value(a).localeCompare(value(b), undefined, { numeric: true, sensitivity: 'base' });

const column = (id: ColumnId, title: string, width: string, compare: Column['compare'], extra: Partial<Column> = {}): Column => ({
  id,
  title,
  width,
  compare,
  defaultDescending: false,
  ...extra,
});

export const COLUMNS: Record<ColumnId, Column> = {
  name: column('name', 'Name', 'minmax(260px, 1fr)', byText((t) => t.name), { stable: (t) => t.name }),
  status: column('status', 'Status', '140px', byText(statusText)),
  progress: column('progress', 'Progress', '150px', byNumber((t) => t.progress), { defaultDescending: true }),
  size: column('size', 'Size', '90px', byNumber((t) => t.size), { align: 'end', defaultDescending: true, stable: (t) => String(t.size) }),
  down: column('down', 'Down', '96px', byNumber((t) => t.dlspeed), { align: 'end', defaultDescending: true }),
  up: column('up', 'Up', '96px', byNumber((t) => t.upspeed), { align: 'end', defaultDescending: true }),
  eta: column('eta', 'ETA', '120px', byNumber((t) => t.eta)),
  seeds: column('seeds', 'Seeds', '90px', byNumber((t) => connectedSeeds(t) * 1e6 + t.num_complete), { align: 'end', defaultDescending: true }),
  peers: column('peers', 'Peers', '90px', byNumber((t) => connectedPeers(t) * 1e6 + t.num_incomplete), { align: 'end', defaultDescending: true }),
  ratio: column('ratio', 'Ratio', '70px', byNumber((t) => t.ratio), { align: 'end', defaultDescending: true }),
  category: column('category', 'Category', '130px', byText((t) => t.category), { stable: (t) => t.category }),
  tags: column('tags', 'Tags', '150px', byText((t) => t.tags), { stable: (t) => t.tags }),
  added: column('added', 'Added', '160px', byNumber((t) => t.added_on), { defaultDescending: true, stable: (t) => String(t.added_on) }),
};

export function sortRows(ts: readonly Torrent[], sort: TableSort): Torrent[] {
  const compare = COLUMNS[sort.column].compare;
  const byName = COLUMNS.name.compare;
  return [...ts].sort((a, b) => {
    const result = compare(a, b) || byName(a, b);
    return sort.descending ? -result : result;
  });
}

export const gridTemplate = (ids: readonly ColumnId[]) => ids.map((id) => COLUMNS[id].width).join(' ');

/** Row horizontal padding (6px each side), matching `.cv-row` / `.cv-header`. */
const ROW_PADDING = 12;

/**
 * The grid's minimum width: the sum of each track's minimum. The grid is otherwise 100% wide, so Name
 * takes the leftover space and ellipsizes; a max-content grid would instead grow with whichever long
 * name happens to be rendered, shifting every column while scrolling.
 */
export const gridMinWidth = (ids: readonly ColumnId[]) =>
  ids.reduce((sum, id) => sum + Number(/(\d+(?:\.\d+)?)px/.exec(COLUMNS[id].width)?.[1] ?? 0), ROW_PADDING);
