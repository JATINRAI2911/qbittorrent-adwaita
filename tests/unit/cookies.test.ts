import { describe, expect, it } from 'vitest';
import { cookieProblems, fromDraft, newCookieDraft, toDraft } from '../../src/features/tools/cookies';

const now = new Date(2001, 0, 15, 15, 0, 0);

describe('cookies', () => {
  it('sends an unedited cookie back exactly as qBittorrent sent it', () => {
    const cookie = { name: 'uid', domain: 't.example', path: '/', value: 's3cret', expirationDate: 1_900_000_000 };
    expect(fromDraft(toDraft(cookie, 1))).toEqual(cookie);
  });

  it('shows expiry as a local date, and an edited date lasts until the end of that day', () => {
    const draft = toDraft({ name: 'uid', domain: 't.example', path: '/', value: 'x', expirationDate: 1_900_000_000 }, 1);
    expect(draft.date).toBe(new Date(1_900_000_000 * 1000).toLocaleDateString('sv'));
    expect(fromDraft({ ...draft, date: '2031-06-01' }).expirationDate).toBe(new Date(2031, 5, 1, 23, 59, 59).getTime() / 1000);
  });

  it('never sends an expiry for a session cookie, since qBittorrent would read 0 as 1970 and drop it', () => {
    const session = toDraft({ name: 'pass', domain: 't.example', path: '', value: 'x', expirationDate: 0 }, 2);
    expect(session).toMatchObject({ expires: false, path: '/' });
    expect('expirationDate' in fromDraft(session)).toBe(false);
  });

  it('starts new cookies with an expiry a year out', () => {
    const draft = newCookieDraft(3, now);
    expect(draft).toMatchObject({ expires: true, date: '2002-01-15', name: '', domain: '', path: '/' });
  });

  it('names what is wrong: missing fields, an expiry already passed (even earlier today), and duplicates', () => {
    const ok = toDraft({ name: 'uid', domain: 't.example', path: '/', value: 'x', expirationDate: 0 }, 1);
    const earlierToday = toDraft({ name: 'old', domain: 't.example', path: '/', value: 'x', expirationDate: new Date(2001, 0, 15, 9, 0).getTime() / 1000 }, 4);
    const problems = cookieProblems([ok, { ...ok, id: 2 }, { ...ok, id: 3, name: '' }, earlierToday, { ...ok, id: 5, name: 'x', domain: ' ' }], now);
    expect(problems).toEqual({
      1: 'Another cookie has the same domain, path and name',
      2: 'Another cookie has the same domain, path and name',
      3: 'Needs a name',
      4: 'Its expiry date has passed',
      5: 'Needs a domain',
    });
  });
});
