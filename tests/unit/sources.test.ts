import { describe, expect, it } from 'vitest';
import { base32ToHex, infoHashOf, isTorrentFile, parseSources } from '../../src/features/add/sources';

const HEX = '0123456789abcdef0123456789abcdef01234567';

describe('infoHashOf', () => {
  it('reads v1 hex, v1 base32 and v2 multihash magnets', () => {
    expect(infoHashOf(`magnet:?xt=urn:btih:${HEX.toUpperCase()}&dn=x`)).toBe(HEX);
    expect(infoHashOf('magnet:?xt=urn:btih:AERUKZ4JVPG66AJDIVTYTK6N54ASGRKN')).toBe(base32ToHex('AERUKZ4JVPG66AJDIVTYTK6N54ASGRKN'));
    expect(infoHashOf(`magnet:?xt=urn:btmh:1220${'ab'.repeat(32)}`)).toBe('ab'.repeat(20));
    expect(infoHashOf('magnet:?dn=nothing')).toBeNull();
  });

  it('prefers the v1 id of a hybrid magnet, whichever xt comes first (qBittorrent shows the v1 hash)', () => {
    const v2 = 'cd'.repeat(32);
    expect(infoHashOf(`magnet:?xt=urn:btmh:1220${v2}&xt=urn:btih:${HEX}&dn=x`)).toBe(HEX);
    expect(infoHashOf(`magnet:?xt=urn:btih:${HEX}&xt=urn:btmh:1220${v2}`)).toBe(HEX);
  });

  it('treats a malformed percent-escape as no hash instead of throwing', () => {
    expect(infoHashOf('magnet:?xt=urn:btih:%zz')).toBeNull();
    expect(() => parseSources('magnet:?xt=urn%E0%A4%A:btih:abc&dn=x')).not.toThrow();
    expect(parseSources('magnet:?xt=urn:btih:%zz').invalid).toEqual(['magnet:?xt=urn:btih:%zz']);
  });

  it('converts base32 to hex', () => {
    expect(base32ToHex('AERUKZ4JVPG66AJDIVTYTK6N54ASGRKN')).toBe('0123456789abcdef0123456789abcdef0123454d');
  });
});

describe('parseSources', () => {
  it('finds magnets, URLs and bare info hashes in messy text, once each', () => {
    const text = `Grab these:
      magnet:?xt=urn:btih:${HEX}&dn=Ubuntu%2024.04&tr=udp%3A%2F%2Ft.example
      and ${HEX.toUpperCase()} (same one) plus
      https://releases.example.org/debian.torrent, then garbage-token`;
    const { sources, invalid } = parseSources(text);
    expect(sources.map((s) => [s.kind, s.label])).toEqual([
      ['magnet', 'Ubuntu 24.04'],
      ['url', 'https://releases.example.org/debian.torrent'],
    ]);
    expect(sources[0]!.hash).toBe(HEX);
    expect(invalid).toEqual([]);
  });

  it('handles hybrid magnets, bare base32 hashes and repeated URLs', () => {
    const v2 = 'cd'.repeat(32);
    const base32 = 'AERUKZ4JVPG66AJDIVTYTK6N54ASGRKN';
    const url = 'https://releases.example.org/debian.torrent';
    const { sources } = parseSources(`magnet:?xt=urn:btmh:1220${v2}&xt=urn:btih:${HEX}&dn=Hybrid ${base32} ${url} ${url}`);
    expect(sources.map((s) => [s.kind, s.hash])).toEqual([
      ['magnet', HEX],
      ['magnet', base32ToHex(base32)],
      ['url', null],
    ]);
  });

  it('turns a bare hash into a magnet and labels unnamed magnets by hash', () => {
    const { sources } = parseSources(HEX);
    expect(sources[0]).toMatchObject({ kind: 'magnet', value: `magnet:?xt=urn:btih:${HEX}`, label: `Magnet ${HEX.slice(0, 8)}…` });
  });

  it('masks passkeys in private download URLs, but keeps the full URL as the value', () => {
    const url = 'https://tracker.example.org/download.php?id=42&passkey=0123456789abcdef0123456789abcdef';
    const { sources } = parseSources(url);
    expect(sources[0]!.value).toBe(url);
    expect(sources[0]!.label).toBe('https://tracker.example.org/download.php?id=42&passkey=••••');
  });

  it('reports things that look like links but are not usable', () => {
    expect(parseSources('magnet:?dn=no-hash ftp://x/y.torrent').invalid).toEqual(['magnet:?dn=no-hash', 'ftp://x/y.torrent']);
    expect(parseSources('just some words').sources).toEqual([]);
  });

  it('keeps commas and semicolons inside a magnet or URL, splitting only on whitespace', () => {
    const magnet = `magnet:?xt=urn:btih:${HEX}&dn=Foo,Bar;Baz&tr=https%3A%2F%2Ft.example%2Fannounce`;
    const url = 'https://t.example/get?id=1,2;3';
    const { sources, invalid } = parseSources(`${magnet}, ${url};`);
    expect(sources.map((s) => s.value)).toEqual([magnet, url]);
    expect(sources[0]!.label).toBe('Foo,Bar;Baz');
    expect(invalid).toEqual([]);
  });
});

describe('isTorrentFile', () => {
  it('accepts .torrent names and the bittorrent MIME type', () => {
    expect(isTorrentFile(new File([''], 'a.TORRENT'))).toBe(true);
    expect(isTorrentFile(new File([''], 'blob', { type: 'application/x-bittorrent' }))).toBe(true);
    expect(isTorrentFile(new File([''], 'a.txt', { type: 'text/plain' }))).toBe(false);
  });
});
