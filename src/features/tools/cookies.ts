import type { Cookie } from '../../api/app';

/** A cookie as the dialog edits it: the expiry as a local date, or none (a session cookie). */
export interface CookieDraft {
  id: number;
  name: string;
  domain: string;
  path: string;
  value: string;
  expires: boolean;
  /** YYYY-MM-DD, local time. */
  date: string;
  /** The exact expiry qBittorrent sent, kept while the date isn't edited so a save doesn't change it. */
  original?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function parseDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 ? date : null;
}

export function toDraft(cookie: Cookie, id: number): CookieDraft {
  const expiry = cookie.expirationDate ?? 0;
  const expires = expiry > 0;
  return {
    id,
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path || '/',
    value: cookie.value,
    expires,
    date: isoDate(expires ? new Date(expiry * 1000) : new Date(Date.now() + 365 * 86_400_000)),
    original: expires ? expiry : undefined,
  };
}

/** A new cookie lasts a year unless changed (a session cookie would vanish when qBittorrent quits). */
export function newCookieDraft(id: number, now = new Date()): CookieDraft {
  const inAYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  return { id, name: '', domain: '', path: '/', value: '', expires: true, date: isoDate(inAYear) };
}

/** Back to qBittorrent's shape: an untouched expiry is sent as it came; an edited date lasts to that day's end. */
export function fromDraft(draft: CookieDraft): Cookie {
  const cookie: Cookie = { name: draft.name.trim(), domain: draft.domain.trim(), path: draft.path.trim() || '/', value: draft.value };
  if (!draft.expires) return cookie;
  if (draft.original !== undefined && isoDate(new Date(draft.original * 1000)) === draft.date) return { ...cookie, expirationDate: draft.original };
  const date = parseDate(draft.date);
  if (date) cookie.expirationDate = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime() / 1000);
  return cookie;
}

/** Per draft id, the first thing that would stop it saving. */
export function cookieProblems(drafts: readonly CookieDraft[], now = new Date()): Record<number, string> {
  const problems: Record<number, string> = {};
  const identity = (d: CookieDraft) => `${d.domain.trim().toLowerCase()}\n${(d.path.trim() || '/')}\n${d.name.trim()}`;
  const counts = new Map<string, number>();
  for (const draft of drafts) counts.set(identity(draft), (counts.get(identity(draft)) ?? 0) + 1);
  for (const draft of drafts) {
    const date = draft.expires ? parseDate(draft.date) : null;
    if (!draft.name.trim()) problems[draft.id] = 'Needs a name';
    else if (!draft.domain.trim()) problems[draft.id] = 'Needs a domain';
    else if (draft.expires && !date) problems[draft.id] = 'Needs a valid expiry date';
    else if (date && (fromDraft(draft).expirationDate ?? 0) * 1000 < now.getTime()) problems[draft.id] = 'Its expiry date has passed';
    else if ((counts.get(identity(draft)) ?? 0) > 1) problems[draft.id] = 'Another cookie has the same domain, path and name';
  }
  return problems;
}
