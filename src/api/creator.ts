import { getBlob, getJson, post, postJson } from './client';

export interface CreatorTaskParams {
  sourcePath: string;
  /** Bytes; 0 lets qBittorrent choose. */
  pieceSize: number;
  private: boolean;
  startSeeding: boolean;
  /** libtorrent 2 only. */
  format?: 'v1' | 'v2' | 'hybrid';
  /** libtorrent 1 only. */
  optimizeAlignment?: boolean;
  /** libtorrent 1 only; KiB, −1 disables. */
  paddedFileSizeLimit?: number;
  /** Lines each URI-encoded, joined with `|`; empty entries separate tracker tiers. */
  trackers?: string;
  urlSeeds?: string;
  comment?: string;
  source?: string;
}

export type CreatorStatus = 'Queued' | 'Running' | 'Finished' | 'Failed';

export interface CreatorTask {
  taskID: string;
  sourcePath: string;
  pieceSize: number;
  private: boolean;
  timeAdded: string;
  status: CreatorStatus;
  /** 0–100 while running. */
  progress?: number;
  errorMessage?: string;
  timeStarted?: string;
  timeFinished?: string;
  comment?: string;
  source?: string;
  trackers?: string[];
  urlSeeds?: string[];
  format?: string;
}

export const creatorApi = {
  addTask: async (params: CreatorTaskParams) => (await postJson<{ taskID: string }>('torrentcreator/addTask', { ...params })).taskID,
  status: (taskID?: string) => getJson<CreatorTask[]>('torrentcreator/status', taskID ? { taskID } : undefined),
  torrentFile: (taskID: string) => getBlob('torrentcreator/torrentFile', { taskID }),
  deleteTask: (taskID: string) => post('torrentcreator/deleteTask', { taskID }),
};

export type CreatorApi = typeof creatorApi;
