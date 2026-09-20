import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureClient } from '../../src/api/client';
import { login, logout } from '../../src/api/auth';
import { maindata } from '../../src/api/sync';

function respond(body: string, status = 200) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, { status }));
  configureClient({ fetch: fn as unknown as typeof fetch });
  return fn;
}

afterEach(() => configureClient({ fetch: (...args) => globalThis.fetch(...args) }));

describe('login', () => {
  it('posts url-encoded credentials and returns ok on 200', async () => {
    const fetch = respond('');
    await expect(login('admin', 'p&ss word')).resolves.toBe('ok');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('api/v2/auth/login');
    expect(init?.body).toBe('username=admin&password=p%26ss+word');
  });

  it('treats 401 as invalid credentials', async () => {
    respond('Unauthorized', 401);
    await expect(login('admin', 'nope')).resolves.toBe('invalid');
  });

  it('treats a 200 "Fails." body (older servers) as invalid credentials', async () => {
    respond('Fails.');
    await expect(login('admin', 'nope')).resolves.toBe('invalid');
  });

  it('reports a banned IP', async () => {
    respond('Your IP address has been banned after too many failed authentication attempts.', 403);
    await expect(login('admin', 'nope')).resolves.toBe('banned');
  });

  it('rethrows network failures', async () => {
    configureClient({
      fetch: (async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch,
    });
    await expect(login('admin', 'x')).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('logout', () => {
  it('posts to auth/logout', async () => {
    const fetch = respond('');
    await logout();
    expect(fetch.mock.calls[0]![0]).toBe('api/v2/auth/logout');
  });
});

describe('maindata', () => {
  it('requests the given rid and returns parsed JSON', async () => {
    const fetch = respond('{"rid":7,"full_update":true}');
    await expect(maindata(6)).resolves.toEqual({ rid: 7, full_update: true });
    expect(fetch.mock.calls[0]![0]).toBe('api/v2/sync/maindata?rid=6');
  });
});
