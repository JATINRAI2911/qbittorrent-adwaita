import { vi, type Mock } from 'vitest';
import type { AppApi } from '../../src/api/app';

export type FakeAppApi = { [K in keyof AppApi]: Mock<AppApi[K]> };

/** Every app endpoint resolves with an empty-but-valid answer; override per test. */
export function fakeAppApi(prefs: Record<string, unknown> = {}): FakeAppApi {
  return {
    directoryContent: vi.fn(async () => [] as string[]),
    defaultSavePath: vi.fn(async () => '/dl'),
    preferences: vi.fn(async () => prefs),
    setPreferences: vi.fn(async () => {}),
    networkInterfaces: vi.fn(async () => []),
    interfaceAddresses: vi.fn(async () => []),
    rotateAPIKey: vi.fn(async () => ''),
    deleteAPIKey: vi.fn(async () => {}),
    sendTestEmail: vi.fn(async () => {}),
  };
}
