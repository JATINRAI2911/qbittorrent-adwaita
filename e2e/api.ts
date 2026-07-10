import { request, type APIRequestContext } from '@playwright/test';
import { BASE_URL, PASSWORD, USERNAME } from './qbt';

/** A logged-in API client for arranging and checking server state directly. */
export async function api(): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL: BASE_URL });
  const response = await context.post('/api/v2/auth/login', { form: { username: USERNAME, password: PASSWORD } });
  // 5.2 answers 204 with an empty body on success (older versions: 200 "Ok."); failures say "Fails.".
  const body = await response.text();
  if (!response.ok() || body === 'Fails.') throw new Error(`e2e login failed: ${response.status()} ${body}`);
  return context;
}

/** Removes every torrent (and its files) so each test starts from an empty library. */
export async function resetLibrary(client: APIRequestContext): Promise<void> {
  const torrents = (await (await client.get('/api/v2/torrents/info')).json()) as { hash: string }[];
  if (torrents.length) await client.post('/api/v2/torrents/delete', { form: { hashes: torrents.map((t) => t.hash).join('|'), deleteFiles: 'true' } });
  for (let i = 0; i < 50; i++) {
    if (!((await (await client.get('/api/v2/torrents/info')).json()) as unknown[]).length) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}
