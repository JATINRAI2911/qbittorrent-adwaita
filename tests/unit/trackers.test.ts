import { describe, expect, it } from 'vitest';
import type { Tracker } from '../../src/api/details';
import { maskSecrets, maskTrackerUrl, splitTrackers, trackerStatusText, trackerSummary, trackerTone } from '../../src/features/details/trackers';

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
    expect(trackerSummary(t({ next_announce: now + 24 * 60 }), now)).toBe('Working · 10 seeds, 2 leechers, 3 peers · 50 downloads · next announce in 24 min');
  });

  it('hides unknown (−1) counts and garbage announce times', () => {
    expect(trackerSummary(t({ num_seeds: -1, num_leeches: -1, num_peers: -1, num_downloaded: -1, next_announce: -361_371_617 }), now)).toBe('Working');
    expect(trackerSummary(t({ status: 1, next_announce: -5 }), now)).toBe('Not contacted yet');
    // How often the tracker has seen the torrent completed ("Times Downloaded" in qBittorrent).
    expect(trackerSummary(t({ num_downloaded: 3400 }), now)).toBe('Working · 10 seeds, 2 leechers, 3 peers · 3,400 downloads');
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

describe('maskTrackerUrl: other passkey forms', () => {
  it.each([
    ['https://t.example/announce.php?authkey=0123456789abcdef0123', 'https://t.example/announce.php?authkey=••••'],
    ['https://t.example/announce.php?uk=abcdefghij0123456789', 'https://t.example/announce.php?uk=••••'],
    ['https://t.example/a/abc123def456/announce', 'https://t.example/a/••••/announce'],
    ['https://t.example/0123456789abcdef0123456789abcdef.announce', 'https://t.example/••••.announce'],
    ['https://t.example/announce;passkey=abc123', 'https://t.example/announce;passkey=••••'],
    ['http://t.example/rss/download?id=9&rsskey=abc', 'http://t.example/rss/download?id=9&rsskey=••••'],
  ])('%s', (url, masked) => expect(maskTrackerUrl(url)).toBe(masked));

  it('leaves ordinary public tracker URLs alone', () => {
    expect(maskTrackerUrl('https://t.example/announce.php?info=1&page=2')).toBe('https://t.example/announce.php?info=1&page=2');
    expect(maskTrackerUrl('http://bt.example.org:6969/announce')).toBe('http://bt.example.org:6969/announce');
  });
});

describe('maskSecrets in tracker messages', () => {
  it('masks passkeys and URLs a tracker echoes back', () => {
    expect(maskSecrets('Invalid passkey 0123456789abcdef0123456789abcdef')).toBe('Invalid passkey ••••');
    expect(maskSecrets('Redirected to https://t.example/a/0123456789abcdef0123456789abcdef/announce')).toBe('Redirected to https://t.example/a/••••/announce');
    expect(maskSecrets('Unregistered torrent')).toBe('Unregistered torrent');
  });

  it('keeps long ordinary words readable: a bare token needs both a digit and a letter', () => {
    expect(maskSecrets('Torrent_is_not_authorized_for_use_on_this_tracker')).toBe('Torrent_is_not_authorized_for_use_on_this_tracker');
    expect(maskSecrets('id 123456789012345678901234567890')).toBe('id 123456789012345678901234567890');
    expect(maskSecrets('key abcd1234efgh5678ijkl9012mnop')).toBe('key ••••');
  });

  it('is applied to tracker summaries', () => {
    expect(trackerSummary(t({ status: 5, msg: 'Bad passkey 0123456789abcdef0123456789abcdef' }), now)).toBe('Tracker error · Bad passkey ••••');
  });
});
