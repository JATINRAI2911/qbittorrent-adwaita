import { describe, expect, it } from 'vitest';
import { pathSuggestions, splitPath } from '../../src/features/paths/suggest';

describe('path suggestions', () => {
  it('splits a path into the folder being listed and the typed prefix', () => {
    expect(splitPath('/Users/me/Med')).toEqual({ dir: '/Users/me/', prefix: 'Med' });
    expect(splitPath('/Users/me/')).toEqual({ dir: '/Users/me/', prefix: '' });
    expect(splitPath('relative')).toEqual({ dir: '', prefix: 'relative' });
  });

  it('suggests matching folders case-insensitively, without the one already typed', () => {
    const entries = ['/Users/me/Media', '/Users/me/Movies', '/Users/me/music', '/Users/me/Documents'];
    expect(pathSuggestions('/Users/me/m', entries)).toEqual(['/Users/me/Media', '/Users/me/Movies', '/Users/me/music']);
    expect(pathSuggestions('/Users/me/Media', entries)).toEqual([]);
    expect(pathSuggestions('/Users/me/', entries, 2)).toEqual(['/Users/me/Documents', '/Users/me/Media']);
  });
});
