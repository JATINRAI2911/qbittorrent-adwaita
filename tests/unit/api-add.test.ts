import { afterEach, describe, expect, it, vi } from 'vitest';
import { addApi } from '../../src/api/add';
import { configureClient } from '../../src/api/client';

function capture(body: string, status = 200) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status }));
  configureClient({ fetch: fn as unknown as typeof fetch });
  return fn;
}

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

const entries = (init: RequestInit | undefined) => [...(init!.body as FormData).entries()].map(([k, v]) => [k, typeof v === 'string' ? v : (v as File).name]);

describe('addApi.add', () => {
  it('posts a multipart form with 5.2 field names and no explicit content type', async () => {
    const fetch = capture('{"success_count":2,"failure_count":0,"pending_count":1,"added_torrent_ids":["a"]}');
    const file = new File(['d4:infoe'], 'ubuntu.torrent', { type: 'application/x-bittorrent' });
    const result = await addApi.add(
      { urls: ['magnet:?xt=urn:btih:aa', 'https://x/y.torrent'], files: [file] },
      { savepath: '/data', category: 'ISOs', tags: ['keep', 'hd'], stopped: true, autoTMM: false, contentLayout: 'Subfolder', stopCondition: 'MetadataReceived', dlLimit: 1024, filePriorities: [1, 0] },
    );
    expect(result).toEqual({ success_count: 2, failure_count: 0, pending_count: 1, added_torrent_ids: ['a'] });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/v2/torrents/add');
    expect(init!.method).toBe('POST');
    expect(init!.headers).toBeUndefined();
    expect(entries(init)).toEqual([
      ['urls', 'magnet:?xt=urn:btih:aa\nhttps://x/y.torrent'],
      ['torrents', 'ubuntu.torrent'],
      ['savepath', '/data'],
      ['category', 'ISOs'],
      ['tags', 'keep,hd'],
      ['stopped', 'true'],
      ['autoTMM', 'false'],
      ['contentLayout', 'Subfolder'],
      ['stopCondition', 'MetadataReceived'],
      ['dlLimit', '1024'],
      ['filePriorities', '1,0'],
    ]);
  });
});

describe('addApi metadata', () => {
  it('reports a pending magnet, then its metadata', async () => {
    capture('{"infohash_v1":"aa","infohash_v2":"","hash":"aa"}', 202);
    await expect(addApi.fetchMetadata('magnet:?xt=urn:btih:aa')).resolves.toEqual({ pending: true, hash: 'aa' });
    const fetch = capture('{"hash":"aa","infohash_v1":"aa","infohash_v2":"","info":{"name":"x","length":5,"files":[{"path":"x","length":5}],"piece_length":1,"pieces_num":5,"private":false},"trackers":[],"webseeds":[],"created_by":"","creation_date":0,"comment":""}');
    const result = await addApi.fetchMetadata('magnet:?xt=urn:btih:aa');
    expect(result.pending).toBe(false);
    expect(result.pending === false && result.metadata.info.name).toBe('x');
    expect(fetch.mock.calls[0]![1]!.body).toBe('source=magnet%3A%3Fxt%3Durn%3Abtih%3Aaa');
  });

  it('parses uploaded files in one multipart request', async () => {
    const fetch = capture('[{"hash":"aa","info":{"name":"a"}},{"hash":"bb","info":{"name":"b"}}]');
    const metas = await addApi.parseMetadata([new File(['1'], 'a.torrent'), new File(['2'], 'b.torrent')]);
    expect(metas.map((m) => m.info.name)).toEqual(['a', 'b']);
    expect(entries(fetch.mock.calls[0]![1])).toEqual([
      ['torrents', 'a.torrent'],
      ['torrents', 'b.torrent'],
    ]);
  });
});
