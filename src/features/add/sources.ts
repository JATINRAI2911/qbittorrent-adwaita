import { maskTrackerUrl } from '../details/trackers';

export interface ParsedSource {
  kind: 'magnet' | 'url';
  /** What is sent to qBittorrent. */
  value: string;
  /** Dedupe key: the info hash when known, otherwise the value. */
  key: string;
  /** Safe to show: magnet name, or the URL with secrets masked. */
  label: string;
  hash: string | null;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32ToHex(value: string): string {
  let bits = '';
  for (const char of value.toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) return '';
    bits += index.toString(2).padStart(5, '0');
  }
  let hex = '';
  for (let i = 0; i + 4 <= bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** decodeURIComponent, or null for a malformed escape like "%zz" (pasted text is often mangled). */
function safeDecode(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

/** The torrent's id as qBittorrent shows it: v1 hex, or the v2 hash truncated to 40 hex characters. */
export function infoHashOf(magnet: string): string | null {
  const query = magnet.slice(magnet.indexOf('?') + 1);
  for (const pair of query.split('&')) {
    const [key, raw = ''] = pair.split('=');
    if (!/^xt(\.\d+)?$/i.test(key ?? '')) continue;
    const value = safeDecode(raw);
    if (value === null) continue;
    const v1 = /^urn:btih:([0-9a-f]{40}|[a-z2-7]{32})$/i.exec(value)?.[1];
    if (v1) return v1.length === 40 ? v1.toLowerCase() : base32ToHex(v1);
    const v2 = /^urn:btmh:1220([0-9a-f]{64})$/i.exec(value)?.[1];
    if (v2) return v2.slice(0, 40).toLowerCase();
  }
  return null;
}

function magnetName(magnet: string): string | null {
  const dn = /[?&]dn=([^&]*)/i.exec(magnet)?.[1];
  if (!dn) return null;
  try {
    return decodeURIComponent(dn.replace(/\+/g, ' ')).trim() || null;
  } catch {
    return null;
  }
}

/** Every usable source in pasted text (each once), and the tokens that looked like links but weren't. */
export function parseSources(text: string): { sources: ParsedSource[]; invalid: string[] } {
  const sources: ParsedSource[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  const push = (source: ParsedSource) => {
    if (seen.has(source.key)) return;
    seen.add(source.key);
    sources.push(source);
  };
  // Whitespace only: commas and semicolons appear unencoded inside magnet names and URL queries.
  for (const raw of text.split(/\s+/)) {
    const token = raw.replace(/^[<("'[]+|[>)"'\].,;]+$/g, '');
    if (!token) continue;
    if (/^magnet:\?/i.test(token)) {
      const hash = infoHashOf(token);
      if (!hash) {
        invalid.push(token);
        continue;
      }
      push({ kind: 'magnet', value: token, key: `hash:${hash}`, label: magnetName(token) ?? `Magnet ${hash.slice(0, 8)}…`, hash });
    } else if (/^[0-9a-f]{40}$/i.test(token) || /^[a-z2-7]{32}$/i.test(token)) {
      const hash = token.length === 40 ? token.toLowerCase() : base32ToHex(token);
      push({ kind: 'magnet', value: `magnet:?xt=urn:btih:${hash}`, key: `hash:${hash}`, label: `Magnet ${hash.slice(0, 8)}…`, hash });
    } else if (/^https?:\/\/\S+$/i.test(token)) {
      push({ kind: 'url', value: token, key: token, label: maskTrackerUrl(token), hash: null });
    } else if (/^[a-z][a-z0-9+.-]*:\S/i.test(token)) {
      invalid.push(token);
    }
  }
  return { sources, invalid };
}

export const isTorrentFile = (file: File) => /\.torrent$/i.test(file.name) || file.type === 'application/x-bittorrent';
