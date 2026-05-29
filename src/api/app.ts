import { getJson, getText, post, postJson } from './client';

export const appApi = {
  /** Absolute paths of the entries in `dirPath` (5.2 returns full paths). 404 when it doesn't exist. */
  directoryContent: (dirPath: string, mode: 'dirs' | 'files' | 'all' = 'dirs') => getJson<string[]>('app/getDirectoryContent', { dirPath, mode }),
  defaultSavePath: () => getText('app/defaultSavePath'),
  preferences: () => getJson<Record<string, unknown>>('app/preferences'),
  /** Sends only the keys given; qBittorrent leaves every other preference as it is. */
  setPreferences: (changes: Record<string, unknown>) => post('app/setPreferences', { json: JSON.stringify(changes) }),
  networkInterfaces: () => getJson<{ name: string; value: string }[]>('app/networkInterfaceList'),
  interfaceAddresses: (iface: string) => getJson<string[]>('app/networkInterfaceAddressList', { iface }),
  /** Creates a new Web UI API key (replacing any old one) and returns it; it is shown in full only now. */
  rotateAPIKey: async () => (await postJson<{ apiKey: string }>('app/rotateAPIKey')).apiKey,
  deleteAPIKey: () => post('app/deleteAPIKey'),
  sendTestEmail: () => post('app/sendTestEmail'),
};

export type AppApi = typeof appApi;
