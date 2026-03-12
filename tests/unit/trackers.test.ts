import { describe, expect, it } from 'vitest';
import type { Tracker } from '../../src/api/details';
import { maskTrackerUrl, splitTrackers, trackerStatusText, trackerSummary, trackerTone } from '../../src/features/details/trackers';

const t = (overrides: Partial<Tracker>): Tracker => ({ url: 'udp://t.example:1337/announce', tier: 0, status: 2, msg: '', num_seeds: 10, num_leeches: 2, num_peers: 3, num_downloaded: 50, ...overrides });
const now = 1_000_000;

describe('splitTrackers', () => {
  it('separates DHT/PeX/LSD from real trackers', () => {
    const { sources, trackers } = splitTrackers([t({ url: '** [DHT] **' }), t({ url: '** [PeX] **' }), t({ url: '** [LSD] **' }), t({})]);
    expect(sources.map((s) => s.label)).toEqual(['DHT', 'Peer Exchange', 'Local Peer Discovery']);
    expect(trackers).toHaveLength(1);
  });
});

describe('tracker status', () => {
  it('maps status codes and in-flight announces to tones and words', () => {
    expect([0, 1, 2, 4, 5, 6].map((status) => trackerTone(t({ status })))).toEqual(['disabled', 'idle', 'ok', 'bad', 'bad', 'bad']);
    expect(trackerTone(t({ status: 2, updating: true }))).toBe('updating');
    expect(trackerStatusText(t({ status: 6 }))).toBe('Unreachable');
    expect(trackerStatusText(t({ status: 1 }))).toBe('Not contacted yet');
  });

  it('summarizes a working tracker with counts and the next announce', () => {
    expect(trackerSummary(t({ next_announce: now + 24 * 60 }), now)).toBe('Working · 10 seeds, 2 leechers, 3 peers · next announce in 24 min');
  });

  it('hides unknown (−1) counts and garbage announce times', () => {
    expect(trackerSummary(t({ num_seeds: -1, num_leeches: -1, num_peers: -1, next_announce: -361_371_617 }), now)).toBe('Working');
    expect(trackerSummary(t({ status: 1, next_announce: -5 }), now)).toBe('Not contacted yet');
  });

  it('shows the tracker’s own message when it is failing', () => {
    expect(trackerSummary(t({ status: 5, msg: 'Unregistered torrent' }), now)).toBe('Tracker error · Unregistered torrent');
  });
});

describe('maskTrackerUrl', () => {
  it('masks passkey-like path segments and secret query values, keeping host and shape', () => {
    expect(maskTrackerUrl('https://tracker.torrentleech.org/a/0123456789abcdef0123456789abcdef/announce')).toBe('https://tracker.torrentleech.org/a/••••/announce');
    expect(maskTrackerUrl('https://t.example/announce.php?passkey=abc123&info=1')).toBe('https://t.example/announce.php?passkey=••••&info=1');
    expect(maskTrackerUrl('udp://tracker.opentrackr.org:1337/announce')).toBe('udp://tracker.opentrackr.org:1337/announce');
  });

  it('falls back to host-only for anything it cannot parse', () => {
    expect(maskTrackerUrl('http://t.example:abc/SECRETSECRETSECRET/announce')).toBe('http://t.example/••••');
  });
});
