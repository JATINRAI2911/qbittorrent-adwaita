import { vi, type Mock } from 'vitest';
import { torrentsApi, type TorrentApi } from '../../src/api/torrents';

export type FakeTorrentApi = { [K in keyof TorrentApi]: Mock<TorrentApi[K]> };

/** Every endpoint resolves successfully by default; override with mockRejectedValueOnce etc. */
export function fakeTorrentApi(): FakeTorrentApi {
  const fake = Object.fromEntries(Object.keys(torrentsApi).map((key) => [key, vi.fn(async () => undefined)])) as unknown as FakeTorrentApi;
  fake.exportTorrent.mockImplementation(async () => new Blob(['d8:announce0:e']));
  return fake;
}
