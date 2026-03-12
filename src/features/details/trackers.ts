import type { Tracker } from '../../api/details';
import { formatCount, formatIn } from '../../lib/format';

export const STICKY_LABEL: Record<string, string> = {
  '** [DHT] **': 'DHT',
  '** [PeX] **': 'Peer Exchange',
  '** [LSD] **': 'Local Peer Discovery',
};

export const isSticky = (t: Tracker) => t.url in STICKY_LABEL;

export function splitTrackers(list: readonly Tracker[]): { sources: (Tracker & { label: string })[]; trackers: Tracker[] } {
  return {
    sources: list.filter(isSticky).map((t) => ({ ...t, label: STICKY_LABEL[t.url]! })),
    trackers: list.filter((t) => !isSticky(t)),
  };
}

export type TrackerTone = 'ok' | 'bad' | 'updating' | 'idle' | 'disabled';

export function trackerTone(t: Tracker): TrackerTone {
  if (t.updating) return 'updating';
  switch (t.status) {
    case 0:
      return 'disabled';
    case 2:
      return 'ok';
    case 4:
    case 5:
    case 6:
      return 'bad';
    default:
      return 'idle';
  }
}

const STATUS_TEXT: Record<number, string> = {
  0: 'Disabled',
  1: 'Not contacted yet',
  2: 'Working',
  4: 'Not working',
  5: 'Tracker error',
  6: 'Unreachable',
};

export function trackerStatusText(t: Tracker): string {
  return t.updating ? 'Updating…' : (STATUS_TEXT[t.status] ?? 'Not contacted yet');
}

const count = (n: number, one: string, many: string) => (n >= 0 ? `${formatCount(n)} ${n === 1 ? one : many}` : null);

/** One line under the tracker URL. Unknown (−1) counts and garbage announce times are left out. */
export function trackerSummary(t: Tracker, nowSeconds: number): string {
  const status = trackerStatusText(t);
  if (trackerTone(t) === 'bad') return t.msg ? `${status} · ${t.msg}` : status;
  const parts = [status];
  if (t.status === 2) {
    const counts = [count(t.num_seeds, 'seed', 'seeds'), count(t.num_leeches, 'leecher', 'leechers'), count(t.num_peers, 'peer', 'peers')].filter(Boolean);
    if (counts.length) parts.push(counts.join(', '));
    if (t.next_announce !== undefined && t.next_announce > nowSeconds) parts.push(`next announce ${formatIn(t.next_announce - nowSeconds)}`);
  } else if (t.msg && t.status !== 1) {
    parts.push(t.msg);
  }
  return parts.join(' · ');
}

const SECRET_QUERY = /^(passkey|key|pk|pid|uid|auth|token|secret|torrent_pass|apikey)$/i;
const SECRET_SEGMENT = /^[A-Za-z0-9_-]{16,}$/;
const MASK = '••••';

/**
 * A tracker URL safe to show on screen: private trackers put the passkey in a path segment or a
 * query value. Copy and Edit use the full URL; this is for display only.
 */
export function maskTrackerUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname
      .split('/')
      .map((segment) => (SECRET_SEGMENT.test(segment) ? MASK : segment))
      .join('/');
    const query = parsed.search
      ? '?' +
        parsed.search
          .slice(1)
          .split('&')
          .map((pair) => {
            const [key, ...rest] = pair.split('=');
            return SECRET_QUERY.test(decodeURIComponent(key ?? '')) && rest.length ? `${key}=${MASK}` : pair;
          })
          .join('&')
      : '';
    return `${parsed.protocol}//${parsed.host}${path}${query}`;
  } catch {
    const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(url)?.[1];
    const host = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]+)/i.exec(url)?.[1];
    return scheme && host ? `${scheme}://${host}/${MASK}` : MASK;
  }
}
