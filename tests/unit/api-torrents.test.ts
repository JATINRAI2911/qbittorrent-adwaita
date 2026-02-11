import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureClient } from '../../src/api/client';
import { torrentsApi } from '../../src/api/torrents';

function capture(body: BodyInit = '') {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body));
  configureClient({ fetch: fn as unknown as typeof fetch });
  return () => fn.mock.calls.map(([url, init]) => ({ url, method: init?.method, body: init?.body }));
}

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

describe('torrentsApi', () => {
  it('joins hashes with | for start and stop', async () => {
    const calls = capture();
    await torrentsApi.start(['a', 'b']);
    await torrentsApi.stop(['c']);
    expect(calls()).toEqual([
      { url: '/api/v2/torrents/start', method: 'POST', body: 'hashes=a%7Cb' },
      { url: '/api/v2/torrents/stop', method: 'POST', body: 'hashes=c' },
    ]);
  });

  it('sends boolean values as true/false', async () => {
    const calls = capture();
    await torrentsApi.setForceStart(['a'], true);
    await torrentsApi.remove(['a'], false);
    await torrentsApi.setAutoManagement(['a'], true);
    await torrentsApi.setSuperSeeding(['a'], false);
    expect(calls().map((c) => [c.url, c.body])).toEqual([
      ['/api/v2/torrents/setForceStart', 'hashes=a&value=true'],
      ['/api/v2/torrents/delete', 'hashes=a&deleteFiles=false'],
      ['/api/v2/torrents/setAutoManagement', 'hashes=a&enable=true'],
      ['/api/v2/torrents/setSuperSeeding', 'hashes=a&value=false'],
    ]);
  });

  it('joins tags with commas and encodes names and paths', async () => {
    const calls = capture();
    await torrentsApi.addTags(['a'], ['keep', 'hd']);
    await torrentsApi.createCategory('Linux ISOs', '/Volumes/Media/ISOs');
    await torrentsApi.rename('a', 'new & name');
    await torrentsApi.setLocation(['a', 'b'], '/tmp/x y');
    expect(calls().map((c) => c.body)).toEqual([
      'hashes=a&tags=keep%2Chd',
      'category=Linux+ISOs&savePath=%2FVolumes%2FMedia%2FISOs',
      'hash=a&name=new+%26+name',
      'hashes=a%7Cb&location=%2Ftmp%2Fx+y',
    ]);
  });

  it('sends every share-limit field', async () => {
    const calls = capture();
    await torrentsApi.setShareLimits(['a'], { ratioLimit: -2, seedingTimeLimit: 120, inactiveSeedingTimeLimit: -1, shareLimitAction: 'Stop' });
    expect(calls()[0]!.body).toBe('hashes=a&ratioLimit=-2&seedingTimeLimit=120&inactiveSeedingTimeLimit=-1&shareLimitAction=Stop');
  });

  it('maps queue moves to their endpoints', async () => {
    const calls = capture();
    for (const where of ['top', 'up', 'down', 'bottom'] as const) await torrentsApi.moveInQueue(['a'], where);
    expect(calls().map((c) => c.url)).toEqual([
      '/api/v2/torrents/topPrio', '/api/v2/torrents/increasePrio', '/api/v2/torrents/decreasePrio', '/api/v2/torrents/bottomPrio',
    ]);
  });

  it('exports a .torrent as a blob with a GET', async () => {
    const calls = capture('d8:announce0:e');
    const blob = await torrentsApi.exportTorrent('abc');
    expect(await blob.text()).toBe('d8:announce0:e');
    expect(calls()[0]).toMatchObject({ url: '/api/v2/torrents/export?hash=abc', method: 'GET' });
  });
});
