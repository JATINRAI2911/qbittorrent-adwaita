import { vi, type Mock } from 'vitest';
import type { AddApi, TorrentMetadata } from '../../src/api/add';

export type FakeAddApi = { [K in keyof AddApi]: Mock<AddApi[K]> };

export function metadata(overrides: Partial<TorrentMetadata> & { name?: string; files?: { path: string; length: number }[] } = {}): TorrentMetadata {
  const { name = 'ubuntu.iso', files = [{ path: name, length: 1_000 }], ...rest } = overrides;
  return {
    hash: 'aa'.repeat(20),
    infohash_v1: 'aa'.repeat(20),
    infohash_v2: '',
    info: { name, length: files.reduce((s, f) => s + f.length, 0), files, piece_length: 16384, pieces_num: 1, private: false },
    trackers: [],
    webseeds: [],
    created_by: '',
    creation_date: 0,
    comment: '',
    ...rest,
  };
}

/** Metadata stays pending by default; add succeeds with one torrent. */
export function fakeAddApi(): FakeAddApi {
  return {
    add: vi.fn(async () => ({ success_count: 1, failure_count: 0, pending_count: 0, added_torrent_ids: ['x'] })),
    fetchMetadata: vi.fn(async () => ({ pending: true as const, hash: '' })),
    parseMetadata: vi.fn(async (files: readonly File[]) => files.map((f) => metadata({ name: f.name.replace(/\.torrent$/, '') }))),
  };
}
