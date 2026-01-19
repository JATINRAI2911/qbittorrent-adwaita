import { describe, expect, it } from 'vitest';
import { subtitleText, summarize } from '../../src/state/summary';
import { makeTorrent } from '../fixtures/torrents';

describe('summarize', () => {
  it('counts by group and takes speeds from the server state', () => {
    const torrents = [
      makeTorrent({ state: 'downloading' }), makeTorrent({ state: 'stalledDL' }),
      makeTorrent({ state: 'uploading', progress: 1 }), makeTorrent({ state: 'stoppedUP', progress: 1 }),
    ];
    expect(summarize(torrents, { dl_info_speed: 31_000_000, up_info_speed: 4_300_000, use_alt_speed_limits: true })).toEqual({
      downloading: 2, seeding: 1, dlSpeed: 31_000_000, upSpeed: 4_300_000, altLimits: true,
    });
  });
});

describe('subtitleText', () => {
  const s = { downloading: 8, seeding: 11, dlSpeed: 31_000_000, upSpeed: 4_300_000, altLimits: false };

  it('joins counts and speeds', () => {
    expect(subtitleText(s, { offline: false, empty: false })).toBe('8 downloading · 11 seeding · ↓ 31.0 MB/s  ↑ 4.3 MB/s');
  });

  it('omits zero counts and mentions alternative limits', () => {
    expect(subtitleText({ ...s, downloading: 0, altLimits: true }, { offline: false, empty: false })).toBe(
      '11 seeding · ↓ 31.0 MB/s  ↑ 4.3 MB/s · Alternative limits',
    );
  });

  it('says Disconnected when offline and nothing when empty', () => {
    expect(subtitleText(s, { offline: true, empty: false })).toBe('Disconnected');
    expect(subtitleText(s, { offline: false, empty: true })).toBe('');
  });
});
