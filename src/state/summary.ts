import type { ServerState, Torrent } from '../api/types';
import { formatCount, formatSpeed } from '../lib/format';
import { groupOf } from './groups';

export interface Summary {
  downloading: number;
  seeding: number;
  dlSpeed: number;
  upSpeed: number;
  altLimits: boolean;
}

export function summarize(torrents: Iterable<Torrent>, server: Partial<ServerState>): Summary {
  let downloading = 0;
  let seeding = 0;
  for (const t of torrents) {
    const group = groupOf(t);
    if (group === 'downloading') downloading++;
    else if (group === 'seeding') seeding++;
  }
  return {
    downloading,
    seeding,
    dlSpeed: server.dl_info_speed ?? 0,
    upSpeed: server.up_info_speed ?? 0,
    altLimits: server.use_alt_speed_limits ?? false,
  };
}

export function subtitleText(summary: Summary, options: { offline: boolean; empty: boolean }): string {
  if (options.offline) return 'Disconnected';
  if (options.empty) return '';
  const parts: string[] = [];
  if (summary.downloading) parts.push(`${formatCount(summary.downloading)} downloading`);
  if (summary.seeding) parts.push(`${formatCount(summary.seeding)} seeding`);
  parts.push(`↓ ${formatSpeed(summary.dlSpeed)}  ↑ ${formatSpeed(summary.upSpeed)}`);
  if (summary.altLimits) parts.push('Alternative limits');
  return parts.join(' · ');
}
