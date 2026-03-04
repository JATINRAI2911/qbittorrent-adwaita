import { getJson, post } from './client';

/** qBittorrent 5.2 per-user client storage (verified live: load takes a JSON array, store a JSON object as `data`). */
export const clientdataApi = {
  load: (keys: readonly string[]) => getJson<Record<string, unknown>>('clientdata/load', { keys: JSON.stringify(keys) }),
  store: (data: Record<string, unknown>) => post('clientdata/store', { data: JSON.stringify(data) }),
};

export type ClientDataApi = typeof clientdataApi;
