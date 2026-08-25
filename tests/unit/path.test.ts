import { describe, expect, it } from 'vitest';
import { normalizeFolder } from '../../src/lib/path';

describe('normalizeFolder', () => {
  it.each([
    ['/data/', '/data'],
    ['/data//', '/data'],
    ['  /data  ', '/data'],
    ['/', '/'],
    ['//', '/'],
    ['C:\\Downloads\\', 'C:\\Downloads'],
    ['C:\\', 'C:\\'],
    ['C:/', 'C:/'],
    ['', ''],
  ])('%j → %j', (input, expected) => expect(normalizeFolder(input)).toBe(expected));
});
