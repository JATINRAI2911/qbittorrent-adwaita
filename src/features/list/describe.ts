import type { Torrent } from '../../api/types';
import { formatBytes, formatEta, formatPercent, formatRatio, formatSpeed } from '../../lib/format';

export type Tone = 'warning' | 'error';
export interface Segment {
  text: string;
  tone?: Tone;
}
export type BubbleKind = 'downloading' | 'seeding' | 'stalled' | 'idle' | 'stopped' | 'queued' | 'busy' | 'error';

export function bubbleKind(t: Torrent): BubbleKind {
  switch (t.state) {
    case 'error':
    case 'missingFiles':
      return 'error';
    case 'metaDL':
    case 'forcedMetaDL':
    case 'checkingDL':
    case 'checkingUP':
    case 'checkingResumeData':
    case 'moving':
      return 'busy';
    case 'queuedDL':
    case 'queuedUP':
      return 'queued';
    case 'stalledDL':
      return 'stalled';
    case 'stalledUP':
      return 'idle';
    case 'uploading':
    case 'forcedUP':
      return 'seeding';
    case 'downloading':
    case 'forcedDL':
      return 'downloading';
    default:
      return 'stopped';
  }
}

const amount = (t: Torrent) =>
  t.size > 0 ? `${formatBytes(t.completed)} of ${formatBytes(t.size)} (${formatPercent(t.progress)})` : 'Size unknown';

const speeds = (t: Torrent) =>
  [t.dlspeed > 0 ? `↓ ${formatSpeed(t.dlspeed)}` : '', t.upspeed > 0 ? `↑ ${formatSpeed(t.upspeed)}` : '']
    .filter(Boolean)
    .join('  ');

const shareInfo = (t: Torrent) => `${formatBytes(t.size)} · Ratio ${formatRatio(t.ratio)}`;

/** The row subtitle, as segments joined by an em dash; toned segments render in warning/error color. */
export function describeRow(t: Torrent): Segment[] {
  switch (t.state) {
    case 'downloading':
    case 'forcedDL':
      return [{ text: amount(t) }, { text: speeds(t) || 'Connecting to peers…' }];
    case 'metaDL':
    case 'forcedMetaDL':
      return [{ text: 'Fetching metadata…' }];
    case 'stalledDL':
      return [{ text: amount(t) }, { text: 'Stalled · waiting for peers', tone: 'warning' }];
    case 'checkingDL':
    case 'checkingUP':
    case 'checkingResumeData':
      return [{ text: `Checking files… ${formatPercent(t.progress)}` }];
    case 'moving':
      return [{ text: `Moving to ${t.save_path}…` }];
    case 'queuedDL':
      return [{ text: `Queued · ${amount(t)}` }];
    case 'queuedUP':
      return [{ text: `Queued for seeding · ${formatBytes(t.size)}` }];
    case 'uploading':
    case 'forcedUP':
      return [{ text: shareInfo(t) }, { text: speeds(t) || 'Seeding' }];
    case 'stalledUP':
      return [{ text: shareInfo(t) }, { text: 'Idle' }];
    case 'stoppedDL':
      return [{ text: `Stopped · ${amount(t)}` }];
    case 'stoppedUP':
      return [{ text: `Completed · ${shareInfo(t)}` }];
    case 'error':
      return [{ text: 'Error · see the Execution Log for details', tone: 'error' }];
    case 'missingFiles':
      return [{ text: `Files are missing from ${t.save_path}`, tone: 'error' }];
    default:
      return [{ text: amount(t) }];
  }
}

export function etaText(t: Torrent): string {
  return (t.state === 'downloading' || t.state === 'forcedDL') && t.dlspeed > 0 ? formatEta(t.eta) : '';
}

export function isInactive(t: Torrent): boolean {
  return /^(stopped|queued)(DL|UP)$/.test(t.state);
}

export function showProgress(t: Torrent): boolean {
  return !(t.progress >= 1) || t.state.startsWith('checking');
}

export function progressTone(t: Torrent): 'accent' | 'inactive' | 'warning' | 'error' {
  if (t.state === 'error' || t.state === 'missingFiles') return 'error';
  if (t.state === 'stalledDL') return 'warning';
  return isInactive(t) ? 'inactive' : 'accent';
}

export function parseTags(tags: string): string[] {
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
}
