import { describe, expect, it } from 'vitest';
import { rewriteCsrfHeaders } from '../../vite.proxy';

describe('rewriteCsrfHeaders', () => {
  const target = 'http://127.0.0.1:9000';

  it('rewrites Origin and Referer to the qBittorrent origin, keeping the referer path', () => {
    expect(
      rewriteCsrfHeaders({ origin: 'http://localhost:5173', referer: 'http://localhost:5173/index.html?x=1' }, target),
    ).toEqual({ origin: 'http://127.0.0.1:9000', referer: 'http://127.0.0.1:9000/index.html?x=1' });
  });

  it('does not invent headers the browser did not send', () => {
    expect(rewriteCsrfHeaders({}, target)).toEqual({});
  });
});
