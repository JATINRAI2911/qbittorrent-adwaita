export type TorrentState =
  | 'error' | 'missingFiles'
  | 'uploading' | 'stoppedUP' | 'queuedUP' | 'stalledUP' | 'checkingUP' | 'forcedUP'
  | 'downloading' | 'metaDL' | 'forcedMetaDL' | 'stoppedDL' | 'queuedDL' | 'stalledDL' | 'checkingDL' | 'forcedDL'
  | 'checkingResumeData' | 'moving' | 'unknown';

/** Fields of a torrent in `sync/maindata` (qBittorrent 5.2). The server sends more keys; the reducer keeps them all. */
export interface Torrent {
  hash: string;
  name: string;
  /** Bytes of wanted files. */
  size: number;
  total_size: number;
  /** 0..1 */
  progress: number;
  dlspeed: number;
  upspeed: number;
  /** Queue position; 0 or -1 when not queued / queueing disabled. */
  priority: number;
  num_seeds: number;
  num_complete: number;
  num_leechs: number;
  num_incomplete: number;
  ratio: number;
  /** Seconds; 8640000 means infinite. */
  eta: number;
  state: TorrentState;
  seq_dl: boolean;
  f_l_piece_prio: boolean;
  category: string;
  /** Comma-and-space separated, e.g. "keep, private". */
  tags: string;
  super_seeding: boolean;
  force_start: boolean;
  auto_tmm: boolean;
  private: boolean;
  has_metadata: boolean;
  save_path: string;
  download_path: string;
  content_path: string;
  /** Unix seconds. */
  added_on: number;
  completion_on: number;
  last_activity: number;
  tracker: string;
  trackers_count: number;
  dl_limit: number;
  up_limit: number;
  downloaded: number;
  uploaded: number;
  amount_left: number;
  completed: number;
  time_active: number;
  seeding_time: number;
  magnet_uri: string;
  infohash_v1: string;
  infohash_v2: string;
  comment: string;
  has_tracker_warning: boolean;
  has_tracker_error: boolean;
  has_other_announce_error: boolean;
  /** Share limits: -2 = use global, -1 = unlimited. Ratio is a number; the two times are minutes. */
  ratio_limit: number;
  seeding_time_limit: number;
  inactive_seeding_time_limit: number;
  share_limit_action: 'Default' | 'Stop' | 'Remove' | 'RemoveWithContent' | 'EnableSuperSeeding';
}

export interface Category {
  name: string;
  savePath: string;
  download_path?: string | false;
}

export interface ServerState {
  connection_status: 'connected' | 'firewalled' | 'disconnected';
  dht_nodes: number;
  dl_info_data: number;
  dl_info_speed: number;
  dl_rate_limit: number;
  up_info_data: number;
  up_info_speed: number;
  up_rate_limit: number;
  free_space_on_disk: number;
  use_alt_speed_limits: boolean;
  queueing: boolean;
  refresh_interval: number;
  alltime_dl: number;
  alltime_ul: number;
  global_ratio: string;
  total_peer_connections: number;
}

export interface MaindataResponse {
  rid: number;
  full_update?: boolean;
  torrents?: Record<string, Partial<Torrent>>;
  torrents_removed?: string[];
  categories?: Record<string, Partial<Category>>;
  categories_removed?: string[];
  tags?: string[];
  tags_removed?: string[];
  trackers?: Record<string, string[]>;
  trackers_removed?: string[];
  server_state?: Partial<ServerState>;
}
