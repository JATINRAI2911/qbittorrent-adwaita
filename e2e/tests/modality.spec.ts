import { expect, test } from '@playwright/test';
import { api, resetLibrary } from '../api';
import { login } from '../fixtures';
import { PASSWORD, USERNAME } from '../qbt';

test.beforeAll(async () => resetLibrary(await api()));

test('Tab stays inside the open dialog, and focus returns to the opener on close', async ({ page }) => {
  await login(page);
  const opener = page.getByRole('button', { name: 'Add Torrents…' });
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
