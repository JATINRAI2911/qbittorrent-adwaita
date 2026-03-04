import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientdataApi } from '../../src/api/clientdata';
import { configureClient } from '../../src/api/client';

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

describe('clientdataApi', () => {
  it('loads keys as a JSON array and stores data as a JSON object', async () => {
    const fetch = vi.fn(async (url: string, _init?: RequestInit) => new Response(url.includes('load') ? '{"adwaita-ui":{"view":"table"}}' : ''));
    configureClient({ fetch: fetch as unknown as typeof globalThis.fetch });
    await expect(clientdataApi.load(['adwaita-ui'])).resolves.toEqual({ 'adwaita-ui': { view: 'table' } });
    await clientdataApi.store({ 'adwaita-ui': { view: 'list' } });
    expect(fetch.mock.calls[0]![0]).toBe('/api/v2/clientdata/load?keys=%5B%22adwaita-ui%22%5D');
    expect(fetch.mock.calls[1]![1]).toMatchObject({ method: 'POST', body: 'data=%7B%22adwaita-ui%22%3A%7B%22view%22%3A%22list%22%7D%7D' });
  });
});
