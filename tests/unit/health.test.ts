import { describe, expect, it } from 'vitest';
import { assessHealth, LOW_SPACE_FLOOR, remainingDownloads, type HealthInput } from '../../src/state/health';
import { makeTorrent } from '../fixtures/torrents';

const GiB = 1024 ** 3;
const input = (overrides: Partial<HealthInput> = {}): HealthInput => ({
  connection: 'online',
  retryIn: 4,
  host: 'nas.local:8080',
  server: { connection_status: 'connected', free_space_on_disk: 500 * GiB },
  torrents: [],
  savePath: '/data',
  listenPort: 51413,
  ...overrides,
});

describe('assessHealth', () => {
  it('is healthy when connected with room on disk', () => {
    expect(assessHealth(input())).toEqual({ level: 'ok', line: 'Connected', banner: null });
  });

  it('names the host and the countdown when qBittorrent is unreachable, whatever else is wrong', () => {
    const health = assessHealth(input({ connection: 'offline', server: { connection_status: 'firewalled', free_space_on_disk: 0 } }));
    expect(health).toEqual({
      level: 'error',
      line: 'Can’t reach qBittorrent',
      // The countdown changes every second, so it sits outside the announced text.
      banner: { tone: 'error', action: 'retry', text: 'Can’t reach qBittorrent at nas.local:8080.', detail: 'Retrying in 4 s…' },
    });
  });

  it('reports no network before a firewall or disk problem', () => {
    const health = assessHealth(input({ server: { connection_status: 'disconnected', free_space_on_disk: 1 } }));
    expect(health.banner).toEqual({ tone: 'error', action: 'connection', text: 'qBittorrent has no network connection.' });
    expect(health.line).toBe('No network connection');
  });

  it('names the listen port when firewalled, and copes without it', () => {
    expect(assessHealth(input({ server: { connection_status: 'firewalled' } })).banner).toEqual({
      tone: 'warning',
      action: 'connection',
      text: 'Incoming connections are blocked. Port 51413 isn’t reachable, so fewer peers can connect.',
    });
    expect(assessHealth(input({ server: { connection_status: 'firewalled' }, listenPort: null })).banner!.text).toBe(
      'Incoming connections are blocked. The listening port isn’t reachable, so fewer peers can connect.',
    );
  });

  it('warns about disk space below 10 GiB, or below what active downloads still need', () => {
    const low = assessHealth(input({ server: { connection_status: 'connected', free_space_on_disk: 9 * GiB } }));
    expect(low).toEqual({
      level: 'warning',
      line: 'Low disk space',
      banner: { tone: 'warning', action: 'downloading', text: 'Only 9.7 GB free on /data. Downloads will stop when the disk is full.' },
    });
    const torrents = [makeTorrent({ state: 'downloading', progress: 0.1, amount_left: 25 * GiB }), makeTorrent({ state: 'uploading', progress: 1, amount_left: 0 })];
    expect(assessHealth(input({ torrents, server: { free_space_on_disk: 20 * GiB } })).level).toBe('warning');
    expect(assessHealth(input({ torrents, server: { free_space_on_disk: 30 * GiB } })).level).toBe('ok');
  });

  it('never raises a low-disk banner before qBittorrent has measured the disk', () => {
    expect(assessHealth(input({ server: { connection_status: 'connected', free_space_on_disk: -1 } })).banner).toBeNull();
    expect(assessHealth(input({ server: { connection_status: 'connected' } })).banner).toBeNull();
    expect(assessHealth(input({ server: { free_space_on_disk: 0 }, savePath: null })).banner!.text).toBe(
      'Only 0 bytes free on the download disk. Downloads will stop when the disk is full.',
    );
  });

  it('says connecting while starting or logged out, with no banner', () => {
    expect(assessHealth(input({ connection: 'starting' }))).toEqual({ level: 'ok', line: 'Connecting…', banner: null });
    expect(assessHealth(input({ connection: 'login' })).banner).toBeNull();
  });
});

describe('remainingDownloads', () => {
  it('sums what is left on downloading torrents only', () => {
    const torrents = [
      makeTorrent({ state: 'downloading', progress: 0.5, amount_left: 3 }),
      makeTorrent({ state: 'stalledDL', progress: 0.5, amount_left: 4 }),
      makeTorrent({ state: 'stoppedDL', progress: 0.5, amount_left: 100 }),
      makeTorrent({ state: 'queuedDL', progress: 0, amount_left: 20 }), // will download when its turn comes
      makeTorrent({ state: 'metaDL', progress: 0, amount_left: 0 }),
    ];
    expect(remainingDownloads(torrents)).toBe(27);
    expect(LOW_SPACE_FLOOR).toBe(10 * GiB);
  });
});
