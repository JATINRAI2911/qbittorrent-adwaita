/** The Speed Limits dialog in the units people think in: KiB/s (0 = unlimited) and HH:MM. */
export interface SpeedLimitsForm {
  dl: number;
  up: number;
  altDl: number;
  altUp: number;
  scheduled: boolean;
  from: string;
  to: string;
  days: number;
}

export const SCHEDULE_DAYS = ['Every day', 'Weekdays', 'Weekends', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
  (label, value) => ({ value, label }),
);

const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const kib = (bytes: unknown) => Math.max(0, Math.round(num(bytes, 0) / 1024));
const hhmm = (hour: unknown, minute: unknown, fallback: number) =>
  `${String(num(hour, fallback)).padStart(2, '0')}:${String(num(minute, 0)).padStart(2, '0')}`;

export function formFromPreferences(prefs: Record<string, unknown>): SpeedLimitsForm {
  return {
    dl: kib(prefs.dl_limit),
    up: kib(prefs.up_limit),
    altDl: kib(prefs.alt_dl_limit),
    altUp: kib(prefs.alt_up_limit),
    scheduled: prefs.scheduler_enabled === true,
    from: hhmm(prefs.schedule_from_hour, prefs.schedule_from_min, 8),
    to: hhmm(prefs.schedule_to_hour, prefs.schedule_to_min, 20),
    days: num(prefs.scheduler_days, 0),
  };
}

const splitTime = (value: string) => value.split(':').map((part) => Number(part)) as [number, number];

/** Only the preferences whose form value changed, in qBittorrent's units (bytes/s, hours, minutes). */
export function preferenceChanges(initial: SpeedLimitsForm, current: SpeedLimitsForm): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  const limits = [['dl', 'dl_limit'], ['up', 'up_limit'], ['altDl', 'alt_dl_limit'], ['altUp', 'alt_up_limit']] as const;
  for (const [field, key] of limits) if (current[field] !== initial[field]) changes[key] = current[field] * 1024;
  if (current.scheduled !== initial.scheduled) changes.scheduler_enabled = current.scheduled;
  for (const [field, prefix] of [['from', 'schedule_from'], ['to', 'schedule_to']] as const) {
    if (current[field] === initial[field] || !/^\d{2}:\d{2}$/.test(current[field])) continue;
    const [hour, minute] = splitTime(current[field]);
    changes[`${prefix}_hour`] = hour;
    changes[`${prefix}_min`] = minute;
  }
  if (current.days !== initial.days) changes.scheduler_days = current.days;
  return changes;
}
