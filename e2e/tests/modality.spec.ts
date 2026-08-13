import { expect, test } from '@playwright/test';
import { api, resetLibrary } from '../api';
import { login, seed } from '../fixtures';
import { PASSWORD, USERNAME } from '../qbt';

test.beforeAll(async () => {
  const client = await api();
  await resetLibrary(client);
  await seed(client, 'november');
});

test('Tab stays inside the open dialog, and focus returns to the opener on close', async ({ page }) => {
  await login(page);
  const opener = page.getByRole('button', { name: 'Add Torrents', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Add Torrents' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press(i % 3 ? 'Tab' : 'Shift+Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('an expired session puts the login above an open dialog, which is still there afterwards', async ({ page }) => {
  await login(page);
  await page.keyboard.press('Control+?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
  await expect(dialog).toBeVisible();
  await page.context().clearCookies();

  // Playwright won't click a covered element, so clicking Log In proves the login is above the dialog.
  await page.getByLabel('Username').fill(USERNAME, { timeout: 15_000 });
  await page.getByLabel('Password').fill(PASSWORD);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByLabel('Username')).toBeHidden();
  await expect(dialog).toBeVisible();
});

test('shortcuts work right after Esc closes the details sheet (focus leaves the closing sheet)', async ({ page }) => {
  await login(page);
  await page.getByRole('listitem').filter({ hasText: 'november' }).first().click();
  const sheet = page.getByRole('region', { name: /details/i });
  await sheet.getByRole('radio', { name: /^Files/ }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+?');
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
});

