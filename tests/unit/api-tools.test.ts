import { afterEach, describe, expect, it, vi } from 'vitest';
import { appApi } from '../../src/api/app';
import { configureClient } from '../../src/api/client';
import { creatorApi } from '../../src/api/creator';
import { logApi } from '../../src/api/log';

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

function capture(reply: (url: string) => string = () => '[]') {
  const calls: string[] = [];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body instanceof FormData ? [...init.body.entries()].map(([k, v]) => `${k}=${v}`).join('&') : (init?.body ?? '');
    calls.push(`${init?.method ?? 'GET'} ${url} ${body}`.trim());
    return new Response(reply(url));
  });
  configureClient({ fetch: fetch as unknown as typeof globalThis.fetch });
  return calls;
}

describe('log endpoints', () => {
  it('reads the execution and peer logs after the last known id', async () => {
    const calls = capture(() => '[{"id":5,"message":"m","timestamp":1,"type":2}]');
    await expect(logApi.main(4)).resolves.toEqual([{ id: 5, message: 'm', timestamp: 1, type: 2 }]);
    await logApi.peers(-1);
    expect(calls).toEqual(['GET api/v2/log/main?last_known_id=4', 'GET api/v2/log/peers?last_known_id=-1']);
  });
});

describe('torrent creator endpoints', () => {
  it('adds a task, reads status, downloads the file and deletes the task', async () => {
    const calls = capture((url) => (url.includes('addTask') ? '{"taskID":"abc"}' : url.includes('torrentFile') ? 'd4:infoe' : '[]'));
    await expect(creatorApi.addTask({ sourcePath: '/data/share', pieceSize: 0, private: true, startSeeding: false, trackers: 'a|b' })).resolves.toBe('abc');
    await creatorApi.status();
    await creatorApi.status('abc');
    await expect(creatorApi.torrentFile('abc').then((blob) => blob.text())).resolves.toBe('d4:infoe');
    await creatorApi.deleteTask('abc');
    expect(calls).toEqual([
      'POST api/v2/torrentcreator/addTask sourcePath=%2Fdata%2Fshare&pieceSize=0&private=true&startSeeding=false&trackers=a%7Cb',
      'GET api/v2/torrentcreator/status',
      'GET api/v2/torrentcreator/status?taskID=abc',
      'GET api/v2/torrentcreator/torrentFile?taskID=abc',
      'POST api/v2/torrentcreator/deleteTask taskID=abc',
    ]);
  });
});

describe('app tool endpoints', () => {
  it('reads versions and build info, reads and replaces cookies, and shuts down', async () => {
    const calls = capture((url) =>
      url.includes('buildInfo') ? '{"qt":"6.10.3","libtorrent":"1.2.20.0","boost":"1.86.0","openssl":"3.6.2","zlib":"1.2.12","bitness":64,"platform":"macos"}'
        : url.includes('webapiVersion') ? '2.15.1'
          : url.includes('version') ? 'v5.2.0'
            : url.includes('/cookies') ? '[{"name":"uid","domain":"t.example","path":"/","value":"s3cret","expirationDate":1900000000}]'
              : '',
    );
    await expect(appApi.version()).resolves.toBe('v5.2.0');
    await expect(appApi.webapiVersion()).resolves.toBe('2.15.1');
    await expect(appApi.buildInfo()).resolves.toMatchObject({ libtorrent: '1.2.20.0', bitness: 64 });
    await expect(appApi.cookies()).resolves.toEqual([{ name: 'uid', domain: 't.example', path: '/', value: 's3cret', expirationDate: 1900000000 }]);
    await appApi.setCookies([{ name: 'uid', domain: 't.example', path: '/', value: 'v', expirationDate: 0 }]);
    await appApi.shutdown();
    expect(calls.slice(4)).toEqual([
      'POST api/v2/app/setCookies cookies=%5B%7B%22name%22%3A%22uid%22%2C%22domain%22%3A%22t.example%22%2C%22path%22%3A%22%2F%22%2C%22value%22%3A%22v%22%2C%22expirationDate%22%3A0%7D%5D',
      'POST api/v2/app/shutdown',
    ]);
  });
});
