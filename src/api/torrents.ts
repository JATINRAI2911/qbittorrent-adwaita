import { getBlob, post } from './client';

export type ShareLimitAction = 'Default' | 'Stop' | 'Remove' | 'RemoveWithContent' | 'EnableSuperSeeding';
export interface ShareLimits {
  /** -2 = use global, -1 = unlimited */
  ratioLimit: number;
  /** minutes; -2 = use global, -1 = unlimited */
  seedingTimeLimit: number;
  /** minutes; -2 = use global, -1 = unlimited */
  inactiveSeedingTimeLimit: number;
  shareLimitAction: ShareLimitAction;
}
export type QueueMove = 'top' | 'up' | 'down' | 'bottom';

/** A category's incomplete-downloads folder; null leaves qBittorrent's setting as it is. */
export type CategoryDownloadPath = { enabled: boolean; path: string } | null;
const downloadPathParams = (download: CategoryDownloadPath | undefined) =>
  download ? { downloadPathEnabled: download.enabled, downloadPath: download.path } : {};

const QUEUE_ENDPOINT: Record<QueueMove, string> = { top: 'topPrio', up: 'increasePrio', down: 'decreasePrio', bottom: 'bottomPrio' };
const joined = (hashes: readonly string[]) => hashes.join('|');

export const torrentsApi = {
  start: (hashes: readonly string[]) => post('torrents/start', { hashes: joined(hashes) }),
  stop: (hashes: readonly string[]) => post('torrents/stop', { hashes: joined(hashes) }),
  setForceStart: (hashes: readonly string[], value: boolean) => post('torrents/setForceStart', { hashes: joined(hashes), value }),
  remove: (hashes: readonly string[], deleteFiles: boolean) => post('torrents/delete', { hashes: joined(hashes), deleteFiles }),
  recheck: (hashes: readonly string[]) => post('torrents/recheck', { hashes: joined(hashes) }),
  reannounce: (hashes: readonly string[]) => post('torrents/reannounce', { hashes: joined(hashes) }),
  setLocation: (hashes: readonly string[], location: string) => post('torrents/setLocation', { hashes: joined(hashes), location }),
  rename: (hash: string, name: string) => post('torrents/rename', { hash, name }),
  setCategory: (hashes: readonly string[], category: string) => post('torrents/setCategory', { hashes: joined(hashes), category }),
  createCategory: (category: string, savePath: string, download?: CategoryDownloadPath) =>
    post('torrents/createCategory', { category, savePath, ...downloadPathParams(download) }),
  editCategory: (category: string, savePath: string, download?: CategoryDownloadPath) =>
    post('torrents/editCategory', { category, savePath, ...downloadPathParams(download) }),
  removeCategories: (categories: readonly string[]) => post('torrents/removeCategories', { categories: categories.join('\n') }),
  deleteTags: (tags: readonly string[]) => post('torrents/deleteTags', { tags: tags.join(',') }),
  addTags: (hashes: readonly string[], tags: readonly string[]) => post('torrents/addTags', { hashes: joined(hashes), tags: tags.join(',') }),
  removeTags: (hashes: readonly string[], tags: readonly string[]) => post('torrents/removeTags', { hashes: joined(hashes), tags: tags.join(',') }),
  createTags: (tags: readonly string[]) => post('torrents/createTags', { tags: tags.join(',') }),
  setDownloadLimit: (hashes: readonly string[], bytesPerSecond: number) => post('torrents/setDownloadLimit', { hashes: joined(hashes), limit: bytesPerSecond }),
  setUploadLimit: (hashes: readonly string[], bytesPerSecond: number) => post('torrents/setUploadLimit', { hashes: joined(hashes), limit: bytesPerSecond }),
  setShareLimits: (hashes: readonly string[], limits: ShareLimits) => post('torrents/setShareLimits', { hashes: joined(hashes), ...limits }),
  moveInQueue: (hashes: readonly string[], where: QueueMove) => post(`torrents/${QUEUE_ENDPOINT[where]}`, { hashes: joined(hashes) }),
  setAutoManagement: (hashes: readonly string[], enable: boolean) => post('torrents/setAutoManagement', { hashes: joined(hashes), enable }),
  toggleSequentialDownload: (hashes: readonly string[]) => post('torrents/toggleSequentialDownload', { hashes: joined(hashes) }),
  toggleFirstLastPiecePrio: (hashes: readonly string[]) => post('torrents/toggleFirstLastPiecePrio', { hashes: joined(hashes) }),
  setSuperSeeding: (hashes: readonly string[], value: boolean) => post('torrents/setSuperSeeding', { hashes: joined(hashes), value }),
  exportTorrent: (hash: string) => getBlob('torrents/export', { hash }),
};

export type TorrentApi = typeof torrentsApi;
