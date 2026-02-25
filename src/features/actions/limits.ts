import type { ShareLimitAction, ShareLimits } from '../../api/torrents';
import type { Torrent } from '../../api/types';
import type { SpeedLimits } from '../../commands/torrent-commands';

export type LimitMode = 'global' | 'unlimited' | 'custom';

export interface LimitsForm {
  downloadKiB: number;
  uploadKiB: number;
  ratioMode: LimitMode;
  ratio: number;
  seedingMode: LimitMode;
  seedingMinutes: number;
  inactiveMode: LimitMode;
  inactiveMinutes: number;
  action: ShareLimitAction;
}

const USE_GLOBAL = -2;
const UNLIMITED = -1;
const modeOf = (value: number): LimitMode => (value === USE_GLOBAL ? 'global' : value === UNLIMITED ? 'unlimited' : 'custom');
const valueOf = (mode: LimitMode, custom: number) => (mode === 'global' ? USE_GLOBAL : mode === 'unlimited' ? UNLIMITED : custom);

export function formFromTorrent(t: Torrent): LimitsForm {
  return {
    downloadKiB: t.dl_limit > 0 ? t.dl_limit / 1024 : 0,
    uploadKiB: t.up_limit > 0 ? t.up_limit / 1024 : 0,
    ratioMode: modeOf(t.ratio_limit),
    ratio: t.ratio_limit >= 0 ? t.ratio_limit : 1,
    seedingMode: modeOf(t.seeding_time_limit),
    seedingMinutes: t.seeding_time_limit >= 0 ? t.seeding_time_limit : 1440,
    inactiveMode: modeOf(t.inactive_seeding_time_limit),
    inactiveMinutes: t.inactive_seeding_time_limit >= 0 ? t.inactive_seeding_time_limit : 1440,
    action: t.share_limit_action,
  };
}

export function limitsFromForm(form: LimitsForm): { speed: SpeedLimits; share: ShareLimits } {
  return {
    speed: { download: Math.round(form.downloadKiB * 1024), upload: Math.round(form.uploadKiB * 1024) },
    share: {
      ratioLimit: valueOf(form.ratioMode, form.ratio),
      seedingTimeLimit: valueOf(form.seedingMode, form.seedingMinutes),
      inactiveSeedingTimeLimit: valueOf(form.inactiveMode, form.inactiveMinutes),
      shareLimitAction: form.action,
    },
  };
}
