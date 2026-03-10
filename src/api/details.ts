import { getJson, post } from './client';

/** `torrents/properties` (qBittorrent 5.2). */
export interface TorrentProperties {
  addition_date: number;
  comment: string;
  /** −1 when never completed */
  completion_date: number;
  created_by: string;
  creation_date: number;
  /** bytes/s; −1 = unlimited */
  dl_limit: number;
  dl_speed: number;
  dl_speed_avg: number;
  download_path: string;
  eta: number;
  hash: string;
  infohash_v1: string;
  infohash_v2: string;
  is_private?: boolean;
  last_seen: number;
  name: string;
  nb_connections: number;
  nb_connections_limit: number;
  peers: number;
  peers_total: number;
  piece_size: number;
  pieces_have: number;
  pieces_num: number;
  /** seconds until the next announce */
  reannounce: number;
  save_path: string;
  seeding_time: number;
  seeds: number;
  seeds_total: number;
  share_ratio: number;
  time_elapsed: number;
  total_downloaded: number;
  total_downloaded_session: number;
  total_size: number;
  total_uploaded: number;
  total_uploaded_session: number;
  total_wasted: number;
  up_limit: number;
  up_speed: number;
  up_speed_avg: number;
}

/** 0 = missing, 1 = downloading, 2 = done */
export type PieceState = 0 | 1 | 2;

export interface TorrentFile {
  index: number;
  /** '/'-separated path inside the torrent */
  name: string;
  size: number;
  progress: number;
  priority: number;
  is_seed?: boolean;
  piece_range: [number, number];
  availability: number;
}

export const FILE_PRIORITY = { skip: 0, normal: 1, high: 6, maximum: 7 } as const;
export type FilePriority = (typeof FILE_PRIORITY)[keyof typeof FILE_PRIORITY];

export interface TrackerEndpoint {
  name: string;
  bt_version: number;
  status: number;
  msg: string;
  num_seeds: number;
  num_leeches: number;
  num_peers: number;
  num_downloaded: number;
  next_announce: number;
  min_announce: number;
  updating: boolean;
}

/** status: 0 disabled (sticky DHT/PeX/LSD), 1 not contacted, 2 working, 4 not working, 5 tracker error, 6 unreachable */
export interface Tracker {
  url: string;
  tier: number;
  status: number;
  msg: string;
  num_seeds: number;
  num_leeches: number;
  num_peers: number;
  num_downloaded: number;
  /** absolute Unix time in 5.2; garbage before the first contact */
  next_announce?: number;
  min_announce?: number;
  updating?: boolean;
  endpoints?: TrackerEndpoint[];
}

export interface Peer {
  client: string;
  peer_id_client?: string;
  progress: number;
  dl_speed: number;
  up_speed: number;
  downloaded: number;
  uploaded: number;
  connection: string;
  flags: string;
  flags_desc: string;
  relevance: number;
  files?: string;
  ip?: string;
  port?: number;
  country_code?: string;
  country?: string;
  host_name?: string;
  i2p_dest?: string;
}

export interface PeersResponse {
  rid: number;
  full_update?: boolean;
  show_flags?: boolean;
  peers?: Record<string, Partial<Peer>>;
  peers_removed?: string[];
}

export interface WebSeed {
  url: string;
}

export const detailsApi = {
  properties: (hash: string) => getJson<TorrentProperties>('torrents/properties', { hash }),
  pieceStates: (hash: string) => getJson<PieceState[]>('torrents/pieceStates', { hash }),
  files: (hash: string) => getJson<TorrentFile[]>('torrents/files', { hash }),
  trackers: (hash: string) => getJson<Tracker[]>('torrents/trackers', { hash }),
  webseeds: (hash: string) => getJson<WebSeed[]>('torrents/webseeds', { hash }),
  peers: (hash: string, rid: number) => getJson<PeersResponse>('sync/torrentPeers', { hash, rid }),
  setFilePriority: (hash: string, ids: readonly number[], priority: FilePriority) => post('torrents/filePrio', { hash, id: ids.join('|'), priority }),
  renameFile: (hash: string, oldPath: string, newPath: string) => post('torrents/renameFile', { hash, oldPath, newPath }),
  renameFolder: (hash: string, oldPath: string, newPath: string) => post('torrents/renameFolder', { hash, oldPath, newPath }),
  /** Blank entries separate tiers. */
  addTrackers: (hash: string, urls: readonly string[]) => post('torrents/addTrackers', { hash, urls: urls.join('\n') }),
  editTracker: (hash: string, url: string, newUrl: string) => post('torrents/editTracker', { hash, url, newUrl }),
  // The server URL-decodes each '|'-separated item, so each one is encoded first.
  removeTrackers: (hash: string, urls: readonly string[]) => post('torrents/removeTrackers', { hash, urls: urls.map(encodeURIComponent).join('|') }),
  addPeers: (hashes: readonly string[], peers: readonly string[]) => post('torrents/addPeers', { hashes: hashes.join('|'), peers: peers.join('|') }),
  banPeers: (peers: readonly string[]) => post('transfer/banPeers', { peers: peers.join('|') }),
  addWebSeeds: (hash: string, urls: readonly string[]) => post('torrents/addWebSeeds', { hash, urls: urls.join('|') }),
  editWebSeed: (hash: string, origUrl: string, newUrl: string) => post('torrents/editWebSeed', { hash, origUrl, newUrl }),
  removeWebSeeds: (hash: string, urls: readonly string[]) => post('torrents/removeWebSeeds', { hash, urls: urls.join('|') }),
  setComment: (hashes: readonly string[], comment: string) => post('torrents/setComment', { hashes: hashes.join('|'), comment }),
};

export type DetailsApi = typeof detailsApi;
