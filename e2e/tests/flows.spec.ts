import { expect, test, type APIRequestContext } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { api, resetLibrary } from '../api';
import { createTorrentFile, login, makeSource, seed, serverState, torrents, until } from '../fixtures';
import { DOWNLOADS_DIR, pauseQbt, unpauseQbt } from '../qbt';

let client: APIRequestContext;

test.beforeAll(async () => {
  client = await api();
});

test.beforeEach(async ({ page }) => {
  await resetLibrary(client);
  await login(page);
});

const row = (page: import('@playwright/test').Page, name: string) => page.getByRole('listitem').filter({ hasText: name }).first();

test('adds a torrent from a file with a preview, and recognises its magnet as already added', async ({ page }) => {
  const file = await createTorrentFile(client, makeSource('alpha'));
  await page.getByRole('button', { name: 'Add Torrents', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Torrents' });
  await dialog.getByLabel('Torrent files').setInputFiles({ name: 'alpha.torrent', mimeType: 'application/x-bittorrent', buffer: file });
  await expect(dialog.getByRole('list', { name: 'Torrents to add' })).toContainText('2 files');
  const savePath = dialog.getByRole('combobox', { name: 'Save path' });
  await savePath.fill('/downloads/src');
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(row(page, 'alpha')).toBeVisible();
  const magnet = (await serverState(client, 'alpha'))!.magnet_uri;

  await page.getByRole('button', { name: 'Add Torrents', exact: true }).click();
  await page.getByRole('textbox', { name: 'Magnet links or URLs' }).fill(magnet);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Add Torrents' }).getByText('Already added')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Add Torrents' }).getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
});

test('stops and starts a torrent from its row', async ({ page }) => {
  await seed(client, 'bravo');
  await row(page, 'bravo').getByRole('button', { name: 'Stop' }).click();
  await until(() => serverState(client, 'bravo'), (t) => t?.state.startsWith('stopped') ?? false, 'bravo to stop');
  await expect(row(page, 'bravo').getByRole('button', { name: 'Start' })).toBeVisible();
  await row(page, 'bravo').getByRole('button', { name: 'Start' }).click();
  await until(() => serverState(client, 'bravo'), (t) => !(t?.state.startsWith('stopped') ?? true), 'bravo to start');
});

test('sets a category on several torrents in selection mode', async ({ page }) => {
  await client.post('/api/v2/torrents/createCategory', { form: { category: 'E2E', savePath: '' } });
  await seed(client, 'charlie');
  await seed(client, 'delta');
  await expect(row(page, 'delta')).toBeVisible();
  await page.getByRole('button', { name: 'Select' }).click();
  await row(page, 'charlie').click();
  await row(page, 'delta').click();
  await expect(page.getByText('2 Selected')).toBeVisible();
  await page.getByRole('toolbar', { name: 'Selection actions' }).getByRole('button', { name: 'Category' }).click();
  await page.getByRole('menuitemradio', { name: 'E2E' }).click();
  await until(() => torrents(client), (all) => all.filter((t) => t.category === 'E2E').length === 2, 'both torrents in E2E');
});

test('deletes a torrent with its files, and another without', async ({ page }) => {
  await seed(client, 'echo');
  await seed(client, 'foxtrot');
  await expect(row(page, 'foxtrot')).toBeVisible();

  await row(page, 'echo').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete…' }).click();
  await page.getByRole('switch', { name: /Also delete files/ }).click();
  await page.getByRole('button', { name: 'Delete Files' }).click();
  await until(async () => existsSync(join(DOWNLOADS_DIR, 'src', 'echo')), (exists) => !exists, 'echo files to be deleted');

  await row(page, 'foxtrot').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete…' }).click();
  await page.getByRole('button', { name: 'Remove' }).click();
  await until(() => torrents(client), (all) => all.length === 0, 'the library to be empty');
  expect(existsSync(join(DOWNLOADS_DIR, 'src', 'foxtrot', 'file-0.bin'))).toBe(true);
});

test('shows every details tab', async ({ page }) => {
  await seed(client, 'golf');
  await row(page, 'golf').click();
  const sheet = page.getByRole('region', { name: /details/i });
  await expect(sheet).toBeVisible();
  for (const tab of ['Overview', 'Files', 'Trackers', 'Peers', 'HTTP Sources']) {
    await sheet.getByRole('radio', { name: new RegExp(`^${tab}`) }).click();
    await expect(sheet.getByRole('radio', { name: new RegExp(`^${tab}`) })).toBeChecked();
  }
  await sheet.getByRole('radio', { name: /^Files/ }).click();
  await expect(sheet.getByText('file-0.bin')).toBeVisible();
});

test('applies a preference instantly and keeps it', async ({ page }) => {
  await page.keyboard.press('Control+,');
  const prefs = page.getByRole('dialog', { name: 'Preferences' });
  await prefs.getByRole('button', { name: 'Speed', exact: true }).click();
  const download = prefs.getByRole('textbox', { name: 'Download', exact: true });
  await download.fill('123');
  await download.press('Enter');
  await until(async () => (await (await client.get('/api/v2/app/preferences')).json()).dl_limit as number, (v) => v === 123 * 1024, 'dl_limit to be saved');
  await prefs.getByRole('button', { name: 'Close' }).click();
  await page.keyboard.press('Control+,');
  await page.getByRole('dialog', { name: 'Preferences' }).getByRole('button', { name: 'Speed', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Preferences' }).getByRole('textbox', { name: 'Download', exact: true })).toHaveValue('123');
  await client.post('/api/v2/app/setPreferences', { form: { json: JSON.stringify({ dl_limit: 0 }) } });
});

test('creates a torrent with the creator and downloads it', async ({ page }) => {
  makeSource('hotel');
  await page.getByRole('button', { name: 'Main Menu' }).click();
  await page.getByRole('menuitem', { name: 'Create Torrent…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create Torrent' });
  await dialog.getByRole('combobox', { name: 'File or folder' }).fill('/downloads/src/hotel');
  await dialog.getByRole('switch', { name: /Start seeding/ }).click();
  await dialog.getByRole('button', { name: 'Create' }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download hotel.torrent' }).click();
  expect((await download).suggestedFilename()).toBe('hotel.torrent');
  await dialog.getByRole('button', { name: 'Remove hotel' }).click();
});

test('shows the offline banner while qBittorrent is unreachable, then recovers', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'No Torrents' })).toBeVisible();
  pauseQbt();
  try {
    await expect(page.getByRole('alert')).toContainText('Can’t reach qBittorrent', { timeout: 30_000 });
  } finally {
    unpauseQbt();
  }
  await page.getByRole('button', { name: 'Retry Now' }).click();
  // Only the offline banner: the container's disk may well raise the low-disk one.
  await expect(page.getByRole('alert').filter({ hasText: 'Can’t reach qBittorrent' })).toBeHidden({ timeout: 20_000 });
});
