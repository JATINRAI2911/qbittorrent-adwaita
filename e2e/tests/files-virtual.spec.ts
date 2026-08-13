import { expect, test } from '@playwright/test';
import { api, resetLibrary } from '../api';
import { login, seed } from '../fixtures';

test.beforeAll(async () => {
  const client = await api();
  await resetLibrary(client);
  await seed(client, 'mike', 400);
});

test('a torrent with hundreds of files renders only what is in view, and scrolls to the end', async ({ page }) => {
  await login(page);
  await page.getByRole('listitem').filter({ hasText: 'mike' }).first().click();
  const sheet = page.getByRole('region', { name: /details/i });
  await sheet.getByRole('radio', { name: /^Files/ }).click();
  const list = sheet.getByRole('list', { name: 'Files' });
  await expect(list.getByRole('listitem').first()).toBeVisible();
  expect(await list.getByRole('listitem').count()).toBeLessThan(100);

  await sheet.locator('.sheet-body').evaluate((el) => (el.scrollTop = el.scrollHeight));
  const last = list.locator('[role="listitem"][aria-posinset="401"]');
  await expect(last).toBeInViewport();
  expect(await list.getByRole('listitem').count()).toBeLessThan(100);
});
