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

  it('lists network interfaces and their addresses, manages the API key, and sends a test email', async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url} ${init?.body ?? ''}`.trim());
      if (url.includes('networkInterfaceList')) return new Response('[{"name":"Wi-Fi","value":"en0"}]');
      if (url.includes('networkInterfaceAddressList')) return new Response('["192.168.1.2","fe80::1"]');
      if (url.includes('rotateAPIKey')) return new Response('{"apiKey":"qbt_abcdef0123456789"}');
      return new Response('');
    });
    configureClient({ fetch: fetch as unknown as typeof globalThis.fetch });
    await expect(appApi.networkInterfaces()).resolves.toEqual([{ name: 'Wi-Fi', value: 'en0' }]);
    await expect(appApi.interfaceAddresses('en0')).resolves.toEqual(['192.168.1.2', 'fe80::1']);
    await expect(appApi.rotateAPIKey()).resolves.toBe('qbt_abcdef0123456789');
    await appApi.deleteAPIKey();
    await appApi.sendTestEmail();
    expect(calls).toEqual([
      'GET /api/v2/app/networkInterfaceList',
      'GET /api/v2/app/networkInterfaceAddressList?iface=en0',
      'POST /api/v2/app/rotateAPIKey',
      'POST /api/v2/app/deleteAPIKey',
      'POST /api/v2/app/sendTestEmail',
    ]);
  });
});
