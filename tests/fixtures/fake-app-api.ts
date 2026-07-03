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
    version: vi.fn(async () => 'v5.2.0'),
    webapiVersion: vi.fn(async () => '2.15.1'),
    buildInfo: vi.fn(async () => ({ qt: '6.10.3', libtorrent: '1.2.20.0', boost: '1.86.0', openssl: '3.6.2', zlib: '1.2.12', bitness: 64, platform: 'macos' })),
    cookies: vi.fn(async () => []),
    setCookies: vi.fn(async () => {}),
    shutdown: vi.fn(async () => {}),
  };
}
