import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureClient } from '../../src/api/client';
import { detailsApi } from '../../src/api/details';

function capture(body: BodyInit = '{}') {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body));
  configureClient({ fetch: fn as unknown as typeof fetch });
  return () => fn.mock.calls.map(([url, init]) => ({ url, method: init?.method ?? 'GET', body: init?.body }));
}

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

describe('detailsApi reads', () => {
  it('GETs the per-torrent endpoints with the hash, and peers with a rid', async () => {
    const calls = capture('[]');
    await detailsApi.properties('h');
    await detailsApi.pieceStates('h');
    await detailsApi.files('h');
    await detailsApi.trackers('h');
    await detailsApi.webseeds('h');
    await detailsApi.peers('h', 7);
    expect(calls().map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET api/v2/torrents/properties?hash=h',
      'GET api/v2/torrents/pieceStates?hash=h',
      'GET api/v2/torrents/files?hash=h',
      'GET api/v2/torrents/trackers?hash=h',
      'GET api/v2/torrents/webseeds?hash=h',
      'GET api/v2/sync/torrentPeers?hash=h&rid=7',
    ]);
  });
});

describe('detailsApi writes', () => {
  it('sends 5.2 parameter names and separators', async () => {
    const calls = capture('');
    await detailsApi.setFilePriority('h', [0, 3], 6);
    await detailsApi.renameFile('h', 'a/b.mkv', 'a/c.mkv');
    await detailsApi.renameFolder('h', 'a', 'z');
    await detailsApi.addTrackers('h', ['udp://a:1', '', 'udp://b:2']);
    await detailsApi.editTracker('h', 'udp://a:1', 'udp://c:3');
    await detailsApi.addPeers(['h'], ['1.2.3.4:5', '[::1]:6']);
    await detailsApi.banPeers(['1.2.3.4:5']);
    await detailsApi.addWebSeeds('h', ['https://x/a', 'https://x/b']);
    await detailsApi.editWebSeed('h', 'https://x/a', 'https://y/a');
    await detailsApi.removeWebSeeds('h', ['https://x/a']);
    await detailsApi.setComment(['h'], 'hi & bye');
    expect(calls().map((c) => `${c.url} ${c.body}`)).toEqual([
      'api/v2/torrents/filePrio hash=h&id=0%7C3&priority=6',
      'api/v2/torrents/renameFile hash=h&oldPath=a%2Fb.mkv&newPath=a%2Fc.mkv',
      'api/v2/torrents/renameFolder hash=h&oldPath=a&newPath=z',
      'api/v2/torrents/addTrackers hash=h&urls=udp%3A%2F%2Fa%3A1%0A%0Audp%3A%2F%2Fb%3A2',
      'api/v2/torrents/editTracker hash=h&url=udp%3A%2F%2Fa%3A1&newUrl=udp%3A%2F%2Fc%3A3',
      'api/v2/torrents/addPeers hashes=h&peers=1.2.3.4%3A5%7C%5B%3A%3A1%5D%3A6',
      'api/v2/transfer/banPeers peers=1.2.3.4%3A5',
      'api/v2/torrents/addWebSeeds hash=h&urls=https%3A%2F%2Fx%2Fa%7Chttps%3A%2F%2Fx%2Fb',
      'api/v2/torrents/editWebSeed hash=h&origUrl=https%3A%2F%2Fx%2Fa&newUrl=https%3A%2F%2Fy%2Fa',
      'api/v2/torrents/removeWebSeeds hash=h&urls=https%3A%2F%2Fx%2Fa',
      'api/v2/torrents/setComment hashes=h&comment=hi+%26+bye',
    ]);
  });

  it('percent-encodes each tracker URL before joining, because the server decodes every item', async () => {
    const calls = capture('');
    await detailsApi.removeTrackers('h', ['https://t.example/a|b/announce?x=%2F', 'udp://u:1']);
    const body = new URLSearchParams(calls()[0]!.body as string);
    expect(body.get('urls')!.split('|').map(decodeURIComponent)).toEqual(['https://t.example/a|b/announce?x=%2F', 'udp://u:1']);
  });
});
