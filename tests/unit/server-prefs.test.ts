import { describe, expect, it, vi } from 'vitest';
import { ServerPrefs } from '../../src/state/server-prefs.svelte';

describe('ServerPrefs', () => {
  it('loads once for concurrent callers and exposes the save path and listen port', async () => {
    const load = vi.fn(async () => ({ save_path: '/data', listen_port: 51413 }));
    const prefs = new ServerPrefs(load);
    expect([prefs.savePath, prefs.listenPort]).toEqual([null, null]);
    await Promise.all([prefs.refresh(), prefs.refresh()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect([prefs.savePath, prefs.listenPort]).toEqual(['/data', 51413]);
  });

  it('keeps the last values when a reload fails', async () => {
    const load = vi.fn().mockResolvedValueOnce({ save_path: '/data' }).mockRejectedValueOnce(new Error('x'));
    const prefs = new ServerPrefs(load);
    await prefs.refresh();
    await prefs.refresh();
    expect(prefs.savePath).toBe('/data');
  });
});
