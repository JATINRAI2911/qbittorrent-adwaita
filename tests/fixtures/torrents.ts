import type { Torrent } from '../../src/api/types';
import { DEFAULT_TORRENT } from '../../src/sync/maindata';

let counter = 0;

/** A complete torrent with sensible defaults; each call gets a unique hash, name and added_on. */
export function makeTorrent(overrides: Partial<Torrent> = {}): Torrent {
  counter++;
  return { ...DEFAULT_TORRENT, hash: `hash${counter}`, name: `Torrent ${counter}`, added_on: 1_700_000_000 + counter, ...overrides };
}
