import { postFormJson, postJson } from './client';
import type { ShareLimitAction } from './torrents';

export type ContentLayout = 'Original' | 'Subfolder' | 'NoSubfolder';
export type StopCondition = 'None' | 'MetadataReceived' | 'FilesChecked';

/** Optional `torrents/add` fields (qBittorrent 5.2 spelling). Limits are bytes/s. */
export interface AddOptions {
  savepath?: string;
  downloadPath?: string;
  useDownloadPath?: boolean;
  category?: string;
  tags?: readonly string[];
  stopped?: boolean;
  skip_checking?: boolean;
  sequentialDownload?: boolean;
  firstLastPiecePrio?: boolean;
  addToTopOfQueue?: boolean;
  autoTMM?: boolean;
  contentLayout?: ContentLayout;
  stopCondition?: StopCondition;
  rename?: string;
  dlLimit?: number;
  upLimit?: number;
  ratioLimit?: number;
  seedingTimeLimit?: number;
  inactiveSeedingTimeLimit?: number;
  shareLimitAction?: ShareLimitAction;
  /** One value per file; only allowed for a single URL/magnet source. */
  filePriorities?: readonly number[];
}

export interface AddSources {
  urls?: string[];
  files?: File[];
}

export interface AddResult {
  success_count: number;
  failure_count: number;
  pending_count: number;
  added_torrent_ids: string[];
}

export interface TorrentMetadata {
  hash: string;
  infohash_v1: string;
  infohash_v2: string;
  info: {
    name: string;
    length: number;
    files: { path: string; length: number }[];
    piece_length: number;
    pieces_num: number;
    private: boolean;
  };
  trackers: { url: string; tier: number }[];
  webseeds: string[];
  created_by: string;
  creation_date: number;
  comment: string;
}

export type MetadataResult = { pending: true; hash: string } | { pending: false; metadata: TorrentMetadata };

const FIELD_ORDER: (keyof AddOptions)[] = [
  'savepath', 'downloadPath', 'useDownloadPath', 'category', 'tags', 'stopped', 'skip_checking', 'sequentialDownload',
  'firstLastPiecePrio', 'addToTopOfQueue', 'autoTMM', 'contentLayout', 'stopCondition', 'rename', 'dlLimit', 'upLimit',
  'ratioLimit', 'seedingTimeLimit', 'inactiveSeedingTimeLimit', 'shareLimitAction', 'filePriorities',
];

function addForm(sources: AddSources, options: AddOptions): FormData {
  const form = new FormData();
  if (sources.urls?.length) form.append('urls', sources.urls.join('\n'));
  for (const file of sources.files ?? []) form.append('torrents', file, file.name);
  for (const key of FIELD_ORDER) {
    const value = options[key];
    if (value === undefined) continue;
    form.append(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return form;
}

export const addApi = {
  add: (sources: AddSources, options: AddOptions) => postFormJson<AddResult>('torrents/add', addForm(sources, options), { timeoutMs: 60_000 }),

  /** Poll with the same source until `pending` is false; qBittorrent reuses the pending job. */
  async fetchMetadata(source: string): Promise<MetadataResult> {
    const result = await postJson<Partial<TorrentMetadata>>('torrents/fetchMetadata', { source });
    return result.info ? { pending: false, metadata: result as TorrentMetadata } : { pending: true, hash: result.hash ?? '' };
  },

  parseMetadata(files: readonly File[]): Promise<TorrentMetadata[]> {
    const form = new FormData();
    for (const file of files) form.append('torrents', file, file.name);
    return postFormJson<TorrentMetadata[]>('torrents/parseMetadata', form, { timeoutMs: 30_000 });
  },
};

export type AddApi = typeof addApi;
