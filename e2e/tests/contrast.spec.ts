import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';
import { api, resetLibrary } from '../api';
import { login, seed } from '../fixtures';

test.beforeAll(async () => {
  const client = await api();
  await resetLibrary(client);
  await seed(client, 'kilo');
});

const style = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const row = (locator: Locator, name: string) => locator.getByRole('listitem').filter({ hasText: name }).first();

test.describe('high contrast (prefers-contrast: more)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
    await login(page);
    await expect(row(page.locator('main'), 'kilo')).toBeVisible();
  });

  test('outlines raised buttons, entries and boxed lists, and keeps dimmed text strong', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Torrents', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add Torrents' });
    await expect(style(dialog.getByRole('button', { name: 'Cancel' }), 'box-shadow')).resolves.toContain('inset');
    await expect(style(dialog.locator('.boxed-list').first(), 'box-shadow')).resolves.toMatch(/0px 0px 0px 1px/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(style(page.locator('.window-title .subtitle'), 'opacity')).resolves.toBe('0.9');
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2aa', 'wcag21aa']).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('forced colours (Windows High Contrast)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await login(page);
    await expect(row(page.locator('main'), 'kilo')).toBeVisible();
  });

  test('keeps selection, switch states and focus visible with system colours', async ({ page }) => {
    const kilo = row(page.locator('main'), 'kilo');
    const before = await style(kilo, 'background-color');
    await kilo.click({ modifiers: ['ControlOrMeta'] });
    await expect(kilo).toHaveClass(/selected/);
    expect(await style(kilo, 'background-color')).not.toBe(before);
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+,');
    const prefs = page.getByRole('dialog', { name: 'Preferences' });
    const on = prefs.getByRole('switch', { checked: true }).first();
    const off = prefs.getByRole('switch', { checked: false }).first();
    expect(await style(on.locator('.switch'), 'background-color')).not.toBe(await style(off.locator('.switch'), 'background-color'));
    expect(await style(off.locator('.switch'), 'border-top-style')).toBe('solid');
    expect(await style(off.locator('.slider'), 'background-color')).not.toBe(await style(off.locator('.switch'), 'background-color'));

    const pages = prefs.getByRole('button', { name: 'Connection', exact: true });
    await pages.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(pages).toBeFocused();
    expect(await style(pages, 'outline-style')).not.toBe('none');
  });
});
