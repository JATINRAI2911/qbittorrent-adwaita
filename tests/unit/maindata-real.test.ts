import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MaindataResponse } from '../../src/api/types';
import { describeRow } from '../../src/features/list/describe';
import { GROUP_ORDER, groupOf } from '../../src/state/groups';
import { applyMaindata, emptySyncState } from '../../src/sync/maindata';

const file = new URL('../fixtures/local/maindata-full.json', import.meta.url);

describe('recorded maindata from a real qBittorrent', () => {
  it.skipIf(!existsSync(file))('merges without desync and every torrent renders cleanly', () => {
    const response = JSON.parse(readFileSync(file, 'utf8')) as MaindataResponse;
    const state = emptySyncState();
    const summary = applyMaindata(state, response);
    expect(summary.desync).toBe(false);
    expect(state.torrents.size).toBe(Object.keys(response.torrents ?? {}).length);
    for (const torrent of state.torrents.values()) {
      expect(GROUP_ORDER).toContain(groupOf(torrent));
      const text = describeRow(torrent).map((s) => s.text).join(' ');
      expect(text, torrent.name).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
