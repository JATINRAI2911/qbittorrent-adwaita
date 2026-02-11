import type { Category, MaindataResponse, ServerState, Torrent } from '../api/types';

export const DEFAULT_TORRENT: Torrent = {
  hash: '', name: '', size: 0, total_size: 0, progress: 0, dlspeed: 0, upspeed: 0, priority: 0,
  num_seeds: 0, num_complete: 0, num_leechs: 0, num_incomplete: 0, ratio: 0, eta: 8_640_000,
  state: 'unknown', seq_dl: false, f_l_piece_prio: false, category: '', tags: '', super_seeding: false,
  force_start: false, auto_tmm: false, private: false, has_metadata: false, save_path: '',
  download_path: '', content_path: '', added_on: 0, completion_on: 0, last_activity: 0, tracker: '',
  trackers_count: 0, dl_limit: 0, up_limit: 0, downloaded: 0, uploaded: 0, amount_left: 0,
  completed: 0, time_active: 0, seeding_time: 0, magnet_uri: '', infohash_v1: '', infohash_v2: '',
  comment: '', has_tracker_warning: false, has_tracker_error: false, has_other_announce_error: false,
  ratio_limit: -2, seeding_time_limit: -2, inactive_seeding_time_limit: -2, share_limit_action: 'Default',
};

export interface SyncState {
  rid: number;
  torrents: Map<string, Torrent>;
  categories: Map<string, Category>;
  tags: Set<string>;
  trackers: Map<string, string[]>;
  server: Partial<ServerState>;
}

export interface MergeSummary {
  added: string[];
  removed: string[];
  /** True when the response referenced state we never had; the caller should resync with rid=0. */
  desync: boolean;
}

export function emptySyncState(): SyncState {
  return { rid: 0, torrents: new Map(), categories: new Map(), tags: new Set(), trackers: new Map(), server: {} };
}

const identity = <T extends object>(value: T): T => value;

/**
 * Merges one `sync/maindata` response into `state` **in place**. Existing objects are patched
 * (never replaced) so a reactive wrapper only re-renders the fields that changed.
 * `create` wraps newly created torrents/categories (e.g. in Svelte `$state`).
 */
export function applyMaindata(
  state: SyncState,
  response: MaindataResponse,
  create: <T extends object>(value: T) => T = identity,
): MergeSummary {
  const summary: MergeSummary = { added: [], removed: [], desync: false };
  const full = response.full_update === true;

  if (full) {
    const keep = new Set(Object.keys(response.torrents ?? {}));
    for (const hash of [...state.torrents.keys()]) {
      if (!keep.has(hash)) {
        state.torrents.delete(hash);
        summary.removed.push(hash);
      }
    }
    const keepCategories = new Set(Object.keys(response.categories ?? {}));
    for (const name of [...state.categories.keys()]) {
      if (!keepCategories.has(name)) state.categories.delete(name);
    }
    state.tags.clear();
    state.trackers.clear();
    for (const key of Object.keys(state.server)) delete (state.server as Record<string, unknown>)[key];
  }

  for (const [hash, patch] of Object.entries(response.torrents ?? {})) {
    const existing = state.torrents.get(hash);
    if (existing) {
      Object.assign(existing, patch);
      continue;
    }
    if (!full && patch.name === undefined) summary.desync = true;
    state.torrents.set(hash, create({ ...DEFAULT_TORRENT, ...patch, hash }));
    summary.added.push(hash);
  }
  for (const hash of response.torrents_removed ?? []) {
    if (state.torrents.delete(hash)) summary.removed.push(hash);
  }

  for (const [name, patch] of Object.entries(response.categories ?? {})) {
    const existing = state.categories.get(name);
    if (existing) Object.assign(existing, patch);
    else state.categories.set(name, create({ name, savePath: '', ...patch }));
  }
  for (const name of response.categories_removed ?? []) state.categories.delete(name);

  for (const tag of response.tags ?? []) state.tags.add(tag);
  for (const tag of response.tags_removed ?? []) state.tags.delete(tag);

  for (const [url, hashes] of Object.entries(response.trackers ?? {})) state.trackers.set(url, hashes);
  for (const url of response.trackers_removed ?? []) state.trackers.delete(url);

  if (response.server_state) Object.assign(state.server, response.server_state);
  state.rid = response.rid;
  return summary;
}
