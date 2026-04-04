import { afterEach, describe, expect, it, vi } from 'vitest';
import { appApi } from '../../src/api/app';
import { configureClient } from '../../src/api/client';

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

describe('appApi', () => {
  it('lists directories as absolute paths, and reads the default save path and preferences', async () => {
    const fetch = vi.fn(async (url: string) => new Response(url.includes('getDirectoryContent') ? '["/data/a","/data/b"]' : url.includes('defaultSavePath') ? '/data' : '{"save_path":"/data"}'));
    configureClient({ fetch: fetch as unknown as typeof globalThis.fetch });
    await expect(appApi.directoryContent('/data')).resolves.toEqual(['/data/a', '/data/b']);
    await expect(appApi.defaultSavePath()).resolves.toBe('/data');
    await expect(appApi.preferences()).resolves.toEqual({ save_path: '/data' });
    expect(fetch.mock.calls[0]![0]).toBe('/api/v2/app/getDirectoryContent?dirPath=%2Fdata&mode=dirs');
  });
});
