import { afterEach, describe, expect, it, vi } from 'vitest';
import { NARROW, watchMedia } from '../../src/ui/adw/media';
import { stubMedia } from '../fixtures/media';

afterEach(() => vi.unstubAllGlobals());

describe('watchMedia', () => {
  it('reports the current match, then every change until unsubscribed', () => {
    const media = stubMedia(true);
    const seen: boolean[] = [];
    const stop = watchMedia(NARROW, (matches) => seen.push(matches));
    media.set(false);
    stop();
    media.set(true);
    expect(seen).toEqual([true, false]);
  });

  it('reports no match where matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined);
    const seen: boolean[] = [];
    watchMedia(NARROW, (matches) => seen.push(matches))();
    expect(seen).toEqual([false]);
  });
});
