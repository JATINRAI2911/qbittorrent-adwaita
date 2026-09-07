import { describe, expect, it } from 'vitest';
import { formFromPreferences, preferenceChanges, SCHEDULE_DAYS } from '../../src/features/global/speed-limits';

const prefs = {
  dl_limit: 40_960_000, up_limit: 0, alt_dl_limit: 10_240, alt_up_limit: 10_240,
  scheduler_enabled: false, schedule_from_hour: 22, schedule_from_min: 5, schedule_to_hour: 7, schedule_to_min: 0, scheduler_days: 1,
};

describe('speed limits form', () => {
  it('shows bytes/s as KiB/s and times as HH:MM, overnight schedules included', () => {
    expect(formFromPreferences(prefs)).toEqual({ dl: 40_000, up: 0, altDl: 10, altUp: 10, scheduled: false, from: '22:05', to: '07:00', days: 1 });
  });

  it('never rounds a small limit down to 0, which would read as unlimited', () => {
    expect(formFromPreferences({ ...prefs, dl_limit: 300 }).dl).toBe(1);
  });

  it('rounds limits that are not whole KiB, and never rewrites them unless changed', () => {
    const form = formFromPreferences({ ...prefs, dl_limit: 1_500 });
    expect(form.dl).toBe(1);
    expect(preferenceChanges(form, { ...form })).toEqual({});
  });

  it('sends only what changed, in qBittorrent’s units', () => {
    const initial = formFromPreferences(prefs);
    expect(preferenceChanges(initial, { ...initial, altDl: 512, scheduled: true, from: '23:30' })).toEqual({
      alt_dl_limit: 524_288, scheduler_enabled: true, schedule_from_hour: 23, schedule_from_min: 30,
    });
  });

  it('copes with missing preferences', () => {
    expect(formFromPreferences({})).toEqual({ dl: 0, up: 0, altDl: 0, altUp: 0, scheduled: false, from: '08:00', to: '20:00', days: 0 });
    expect(SCHEDULE_DAYS.map((d) => d.label)).toEqual(['Every day', 'Weekdays', 'Weekends', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  });
});
