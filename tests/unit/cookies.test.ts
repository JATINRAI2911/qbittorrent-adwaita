import { describe, expect, it } from 'vitest';
import { cookieProblems, fromDraft, toDraft } from '../../src/features/tools/cookies';

const today = new Date(2001, 0, 15);

describe('cookies', () => {
  it('shows expiry as a local date and sends it back as the end of that day', () => {
    const expiry = new Date(2027, 0, 15, 23, 59, 59).getTime() / 1000;
    const draft = toDraft({ name: 'uid', domain: 't.example', path: '/', value: 's3cret', expirationDate: expiry }, 1);
    expect(draft).toEqual({ id: 1, name: 'uid', domain: 't.example', path: '/', value: 's3cret', expires: true, date: '2027-01-15' });
    expect(fromDraft(draft)).toEqual({ name: 'uid', domain: 't.example', path: '/', value: 's3cret', expirationDate: expiry });
  });

  it('treats a missing expiry as a session cookie, and defaults the path', () => {
    const draft = toDraft({ name: 'pass', domain: 't.example', path: '', value: 'x', expirationDate: 0 }, 2);
    expect(draft).toMatchObject({ expires: false, path: '/' });
    expect(fromDraft(draft).expirationDate).toBe(0);
  });

  it('names what is wrong: missing fields, past expiry, and duplicates', () => {
    const ok = toDraft({ name: 'uid', domain: 't.example', path: '/', value: 'x', expirationDate: 0 }, 1);
    const problems = cookieProblems(
      [
        ok,
        { ...ok, id: 2 },
        { ...ok, id: 3, name: '' },
        { ...ok, id: 4, name: 'old', expires: true, date: '2000-01-01' },
        { ...ok, id: 5, name: 'x', domain: ' ' },
      ],
      today,
    );
    expect(problems).toEqual({
      1: 'Another cookie has the same domain, path and name',
      2: 'Another cookie has the same domain, path and name',
      3: 'Needs a name',
      4: 'Its expiry date has passed',
      5: 'Needs a domain',
    });
  });
});
