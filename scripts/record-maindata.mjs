// Records a real full maindata response for local-only tests.
// Usage: QBT_URL=http://127.0.0.1:9000 QBT_USER=admin QBT_PASS=secret node scripts/record-maindata.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.QBT_URL ?? 'http://127.0.0.1:9000';
const login = await fetch(`${base}/api/v2/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ username: process.env.QBT_USER ?? 'admin', password: process.env.QBT_PASS ?? '' }),
});
if (!login.ok) throw new Error(`Login failed: HTTP ${login.status} ${await login.text()}`);
const cookie = login.headers.get('set-cookie')?.split(';')[0];
if (!cookie) throw new Error('Login succeeded but no session cookie was returned');

const response = await fetch(`${base}/api/v2/sync/maindata?rid=0`, { headers: { Cookie: cookie } });
if (!response.ok) throw new Error(`maindata failed: HTTP ${response.status}`);
const data = await response.json();

await mkdir('tests/fixtures/local', { recursive: true });
await writeFile('tests/fixtures/local/maindata-full.json', JSON.stringify(data, null, 2));
console.log(`Saved ${Object.keys(data.torrents ?? {}).length} torrents to tests/fixtures/local/maindata-full.json`);
