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
  const msg = maskSecrets(t.msg);
  if (trackerTone(t) === 'bad') return msg ? `${status} · ${msg}` : status;
  const parts = [status];
  if (t.status === 2) {
    const counts = [count(t.num_seeds, 'seed', 'seeds'), count(t.num_leeches, 'leecher', 'leechers'), count(t.num_peers, 'peer', 'peers')].filter(Boolean);
    if (counts.length) parts.push(counts.join(', '));
    if (t.next_announce !== undefined && t.next_announce > nowSeconds) parts.push(`next announce ${formatIn(t.next_announce - nowSeconds)}`);
  } else if (msg && t.status !== 1) {
    parts.push(msg);
  }
  return parts.join(' · ');
}

const SECRET_KEY = /^(passkey|pass|key|pk|pid|uid|uk|auth|authkey|token|secret|torrent_pass|apikey|rsskey|sid)$/i;
/** A long opaque token: passkeys are usually 16–40 characters of [A-Za-z0-9_-]. */
const LONG_TOKEN = /^[A-Za-z0-9_-]{16,}$/;
/** Right before `announce`, shorter tokens with a digit are passkeys too (e.g. /a/abc123def456/announce). */
const NEAR_ANNOUNCE_TOKEN = /^(?=.*\d)[A-Za-z0-9_-]{10,}$/;
const MASK = '••••';

const maskParam = (param: string) => {
  const [key, ...rest] = param.split('=');
  const value = rest.join('=');
  return rest.length && (SECRET_KEY.test(decodeURIComponent(key ?? '')) || LONG_TOKEN.test(value)) ? `${key}=${MASK}` : param;
};

function maskSegment(segment: string, next: string | undefined): string {
  const [head = '', ...matrix] = segment.split(';');
  let base = head;
  if (LONG_TOKEN.test(base) || (/^announce/i.test(next ?? '') && NEAR_ANNOUNCE_TOKEN.test(base))) base = MASK;
  else {
    const dot = base.indexOf('.');
    if (dot > 0 && LONG_TOKEN.test(base.slice(0, dot))) base = MASK + base.slice(dot);
  }
  return [base, ...matrix.map(maskParam)].join(';');
}

/**
 * A tracker URL safe to show on screen: private trackers put the passkey in a path segment, a
 * matrix parameter or a query value. Copy and Edit use the full URL; this is for display only.
 */
export function maskTrackerUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/');
    const path = segments.map((segment, i) => maskSegment(segment, segments[i + 1])).join('/');
    const query = parsed.search ? '?' + parsed.search.slice(1).split('&').map(maskParam).join('&') : '';
    return `${parsed.protocol}//${parsed.host}${path}${query}`;
  } catch {
    const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(url)?.[1];
    const host = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]+)/i.exec(url)?.[1];
    return scheme && host ? `${scheme}://${host}/${MASK}` : MASK;
  }
}

/** A bare token in free text: 24+ characters with at least one digit and one letter, so long words stay. */
const BARE_TOKEN = /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/g;

/** Mask URLs and long tokens inside free text a tracker sent back (some echo the passkey). */
export function maskSecrets(text: string): string {
  return text.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, (url) => maskTrackerUrl(url)).replace(BARE_TOKEN, MASK);
}
