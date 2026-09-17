import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOWNLOADS_DIR, PASSWORD, USERNAME } from './qbt';

export interface ServerTorrent {
  hash: string;
  name: string;
  state: string;
  category: string;
  magnet_uri: string;
}

export async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('banner')).toBeVisible();
  // The login layer fades out; wait until it has gone so later lookups can't land on it.
  await expect(page.locator('.login-layer')).toHaveCount(0);
}

/** Random files under the container's /downloads/src/<name>; returns the path qBittorrent sees. */
export function makeSource(name: string, files = 2, size = 48 * 1024): string {
  const dir = join(DOWNLOADS_DIR, 'src', name);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < files; i++) writeFileSync(join(dir, `file-${i}.bin`), randomBytes(size));
  return `/downloads/src/${name}`;
}

async function until<T>(read: () => Promise<T>, done: (value: T) => boolean, what: string, timeoutMs = 20_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

/** A .torrent of `sourcePath`, made by the server's own torrent creator. */
export async function createTorrentFile(client: APIRequestContext, sourcePath: string): Promise<Buffer> {
  const { taskID } = (await (await client.post('/api/v2/torrentcreator/addTask', { form: { sourcePath, startSeeding: 'false', pieceSize: '16384' } })).json()) as { taskID: string };
  await until(
    async () => ((await (await client.get('/api/v2/torrentcreator/status', { params: { taskID } })).json()) as { status: string; errorMessage?: string }[])[0]!,
    (task) => {
      if (task.status === 'Failed') throw new Error(`creator failed: ${task.errorMessage}`);
      return task.status === 'Finished';
    },
    'the torrent creator',
  );
  const file = await (await client.get('/api/v2/torrentcreator/torrentFile', { params: { taskID } })).body();
  await client.post('/api/v2/torrentcreator/deleteTask', { form: { taskID } });
  return file;
}

export async function torrents(client: APIRequestContext): Promise<ServerTorrent[]> {
  return (await (await client.get('/api/v2/torrents/info')).json()) as ServerTorrent[];
}

/** Adds a local torrent over the API, seeding from its source folder. */
export async function seed(client: APIRequestContext, name: string, files = 2): Promise<ServerTorrent> {
  const file = await createTorrentFile(client, makeSource(name, files, files > 2 ? 1024 : undefined));
  await client.post('/api/v2/torrents/add', {
    multipart: { torrents: { name: `${name}.torrent`, mimeType: 'application/x-bittorrent', buffer: file }, savepath: '/downloads/src', skip_checking: 'true' },
  });
  const list = await until(() => torrents(client), (all) => all.some((t) => t.name === name), `${name} to be added`);
  return list.find((t) => t.name === name)!;
}

export async function serverState(client: APIRequestContext, name: string): Promise<ServerTorrent | undefined> {
  return (await torrents(client)).find((t) => t.name === name);
}

export { until };

/** A torrent whose files aren't where qBittorrent looks: rechecked, it ends up in an error state. */
export async function broken(client: APIRequestContext, name: string): Promise<ServerTorrent> {
  const file = await createTorrentFile(client, makeSource(name));
  await client.post('/api/v2/torrents/add', {
    multipart: { torrents: { name: `${name}.torrent`, mimeType: 'application/x-bittorrent', buffer: file }, savepath: '/downloads/nowhere', skip_checking: 'true' },
  });
  const added = (await until(() => torrents(client), (all) => all.some((t) => t.name === name), `${name} to be added`)).find((t) => t.name === name)!;
  await client.post('/api/v2/torrents/recheck', { form: { hashes: added.hash } });
  const list = await until(() => torrents(client), (all) => ['missingFiles', 'error'].includes(all.find((t) => t.name === name)?.state ?? ''), `${name} to fail`);
  return list.find((t) => t.name === name)!;
}

