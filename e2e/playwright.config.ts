import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './qbt';

export default defineConfig({
  testDir: './tests',
  // One qBittorrent for the whole suite: tests share it, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
});
