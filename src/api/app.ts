import { getJson, getText } from './client';

export const appApi = {
  /** Absolute paths of the entries in `dirPath` (5.2 returns full paths). 404 when it doesn't exist. */
  directoryContent: (dirPath: string, mode: 'dirs' | 'files' | 'all' = 'dirs') => getJson<string[]>('app/getDirectoryContent', { dirPath, mode }),
  defaultSavePath: () => getText('app/defaultSavePath'),
  preferences: () => getJson<Record<string, unknown>>('app/preferences'),
};

export type AppApi = typeof appApi;
