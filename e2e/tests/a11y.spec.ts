import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { api, resetLibrary } from '../api';
import { broken, login, seed } from '../fixtures';

let client: APIRequestContext;

test.beforeAll(async () => {
  client = await api();
  await resetLibrary(client);
  await seed(client, 'india');
  await seed(client, 'juliet');
  await broken(client, 'kilo-missing');
});

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page: Page, what: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const report = violations.map((v) => `${what} · ${v.id} (${v.impact}): ${v.help}\n${v.nodes.slice(0, 4).map((n) => `    ${n.target.join(' ')} - ${n.failureSummary?.split('\n').slice(1).join(' ')}`).join('\n')}`);
  expect(report, report.join('\n')).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`login screen, ${scheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
    await scan(page, 'login');
  });

  test.describe(`${scheme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      // Reduced motion makes transitions instant, so axe sees settled colours and no leaving elements.
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await login(page);
      await expect(page.getByRole('listitem').filter({ hasText: 'juliet' })).toBeVisible();
    });

    test('list, details sheet and table', async ({ page }) => {
      await scan(page, 'list');
      // Error text on a selected row (the one whose details are open) must stay readable.
      await page.getByRole('listitem').filter({ hasText: 'kilo-missing' }).first().click();
      await page.keyboard.press('Escape');
      await page.getByRole('listitem').filter({ hasText: 'kilo-missing' }).first().click({ modifiers: ['ControlOrMeta'] });
      await scan(page, 'list with a selected error row');
      await page.keyboard.press('Escape');
      await page.getByRole('listitem').filter({ hasText: 'india' }).first().click();
      const sheet = page.getByRole('region', { name: /details/i });
      for (const tab of ['Overview', 'Files', 'Trackers', 'Peers', 'HTTP Sources']) {
        const radio = sheet.getByRole('radio', { name: new RegExp(`^${tab}`) });
        await radio.click();
        await expect(radio).toBeChecked();
        await scan(page, `details ${tab}`);
      }
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Table View' }).click();
      await expect(page.getByRole('grid')).toBeVisible();
      await scan(page, 'table');
      await page.getByRole('button', { name: 'List View' }).click();
    });

    test('dialogs', async ({ page }) => {
      await page.getByRole('button', { name: 'Add Torrents', exact: true }).click();
      const add = page.getByRole('dialog', { name: 'Add Torrents' });
      await expect(add).toBeVisible();
      await scan(page, 'add');
      await page.keyboard.press('Escape');
      await expect(add).toBeHidden();
      await page.keyboard.press('Control+,');
      const prefs = page.getByRole('dialog', { name: 'Preferences' });
      await prefs.getByRole('button', { name: 'Connection', exact: true }).click();
      await scan(page, 'preferences');
      await prefs.getByRole('button', { name: 'Close' }).click();
      await expect(prefs).toBeHidden();
      await page.getByRole('button', { name: 'Main Menu' }).click();
      await page.getByRole('menuitem', { name: 'Execution Log' }).click();
      await expect(page.getByRole('list', { name: 'Messages' })).toBeVisible();
      await scan(page, 'log');
    });
  });
}
