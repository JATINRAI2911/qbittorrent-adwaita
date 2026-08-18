import type { ServerState, Torrent } from '../api/types';
import { formatBytes } from '../lib/format';
import type { Connection } from './session.svelte';

export type HealthLevel = 'ok' | 'warning' | 'error';
export type BannerAction = 'retry' | 'connection' | 'downloading';

export interface Health {
  level: HealthLevel;
  /** Short line for the status popover and the status button's accessible name. */
  line: string;
  /** `detail` is shown but not announced (it changes every second). */
  banner: { text: string; detail?: string; tone: 'warning' | 'error'; action: BannerAction } | null;
}

export interface HealthInput {
  connection: Connection;
  retryIn: number;
  host: string;
  server: Partial<ServerState>;
  torrents: Iterable<Pick<Torrent, 'state' | 'progress' | 'amount_left'>>;
  savePath: string | null;
  listenPort: number | null;
}

export const LOW_SPACE_FLOOR = 10 * 1024 ** 3;
export const HEALTHY: Health = { level: 'ok', line: 'Connected', banner: null };

export function remainingDownloads(torrents: HealthInput['torrents']): number {
  let left = 0;
  // Everything still to come, queued included; stopped torrents only once they're started again.
  for (const t of torrents) if (t.state === 'downloading' || (/DL$/.test(t.state) && t.state !== 'stoppedDL')) left += Math.max(0, t.amount_left);
  return left;
}

/** One banner at a time, highest priority first. */
export function assessHealth(input: HealthInput): Health {
  if (input.connection === 'offline') {
    return {
      level: 'error',
      line: 'Can’t reach qBittorrent',
      banner: { tone: 'error', action: 'retry', text: `Can’t reach qBittorrent at ${input.host}.`, detail: `Retrying in ${input.retryIn} s…` },
    };
  }
  if (input.connection !== 'online') return { level: 'ok', line: 'Connecting…', banner: null };

  const server = input.server;
  if (server.connection_status === 'disconnected') {
    return { level: 'error', line: 'No network connection', banner: { tone: 'error', action: 'connection', text: 'qBittorrent has no network connection.' } };
  }
  if (server.connection_status === 'firewalled') {
    const port = input.listenPort ? `Port ${input.listenPort} isn’t reachable` : 'The listening port isn’t reachable';
    return {
      level: 'warning',
      line: 'Incoming connections blocked',
      banner: { tone: 'warning', action: 'connection', text: `Incoming connections are blocked. ${port}, so fewer peers can connect.` },
    };
  }
  // Negative (or absent) means qBittorrent hasn't measured the disk yet.
  const free = server.free_space_on_disk;
  if (typeof free === 'number' && free >= 0 && free < Math.max(LOW_SPACE_FLOOR, remainingDownloads(input.torrents))) {
    return {
      level: 'warning',
      line: 'Low disk space',
      banner: {
        tone: 'warning',
        action: 'downloading',
        text: `Only ${formatBytes(free)} free on ${input.savePath ?? 'the download disk'}. Downloads will stop when the disk is full.`,
      },
    };
  }
  return HEALTHY;
}
