import { expect, test } from '@playwright/test';
import { api, resetLibrary } from '../api';
import { PASSWORD, USERNAME } from '../qbt';

test.beforeAll(async () => resetLibrary(await api()));

test('refuses a wrong password, then logs in to an empty library', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByText(/incorrect|wrong/i)).toBeVisible();
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('heading', { name: 'No Torrents' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Torrents…' })).toBeVisible();
});
