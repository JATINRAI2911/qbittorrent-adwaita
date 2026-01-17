import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureClient, getJson, post, request } from '../../src/api/client';

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  configureClient({ fetch: fn as unknown as typeof fetch });
  return fn;
}

afterEach(() => {
  vi.useRealTimers();
  configureClient({ fetch: (...args) => globalThis.fetch(...args) });
});

describe('request', () => {
  it('encodes GET params into the query string and sends no body', async () => {
    const fetch = mockFetch(async () => new Response('{"rid":5}'));
    await expect(getJson('sync/maindata', { rid: 5 })).resolves.toEqual({ rid: 5 });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/v2/sync/maindata?rid=5');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('sends POST params as a form body, skipping undefined and stringifying booleans', async () => {
    const fetch = mockFetch(async () => new Response(''));
    await post('torrents/stop', { hashes: 'a|b', deleteFiles: false, skipped: undefined });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/v2/torrents/stop');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toBe('hashes=a%7Cb&deleteFiles=false');
  });

  it.each([
    [403, 'Forbidden', 'auth'],
    [403, 'Your IP address has been banned after too many failed authentication attempts.', 'banned'],
    [401, 'Unauthorized', 'auth'],
    [500, 'boom', 'server'],
    [409, 'Torrent is not ready', 'request'],
  ])('maps HTTP %d (%s) to kind %s and keeps the server message', async (status, body, kind) => {
    mockFetch(async () => new Response(body, { status }));
    await expect(request('x')).rejects.toMatchObject({ kind, status, message: body });
  });

  it('maps a rejected fetch to a network error', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const error = await request('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'network', status: 0 });
  });

  it('times out slow requests', async () => {
    vi.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
        ),
    );
    const pending = request('x', { timeoutMs: 50 }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(50);
    await expect(pending).resolves.toMatchObject({ kind: 'timeout' });
  });

  it('reports caller aborts as aborted, not as timeouts', async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
        ),
    );
    const controller = new AbortController();
    const pending = request('x', { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    await expect(pending).resolves.toMatchObject({ kind: 'aborted' });
  });
});
