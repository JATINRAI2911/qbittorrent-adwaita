import { describe, expect, it } from 'vitest';
import { formFromTorrent, limitsFromForm } from '../../src/features/actions/limits';
import { makeTorrent } from '../fixtures/torrents';

describe('limits form', () => {
  it('reads sentinels and converts bytes to KiB', () => {
    const form = formFromTorrent(makeTorrent({ dl_limit: 2048, up_limit: 0, ratio_limit: -2, seeding_time_limit: -1, inactive_seeding_time_limit: 90, share_limit_action: 'Stop' }));
    expect(form).toEqual({
      downloadKiB: 2, uploadKiB: 0,
      ratioMode: 'global', ratio: 1,
      seedingMode: 'unlimited', seedingMinutes: 1440,
      inactiveMode: 'custom', inactiveMinutes: 90,
      action: 'Stop',
    });
  });

  it('writes sentinels back and converts KiB to bytes', () => {
    expect(
      limitsFromForm({ downloadKiB: 1.5, uploadKiB: 0, ratioMode: 'custom', ratio: 2.5, seedingMode: 'global', seedingMinutes: 5, inactiveMode: 'unlimited', inactiveMinutes: 5, action: 'Default' }),
    ).toEqual({
      speed: { download: 1536, upload: 0 },
      share: { ratioLimit: 2.5, seedingTimeLimit: -2, inactiveSeedingTimeLimit: -1, shareLimitAction: 'Default' },
    });
  });
});
