import { describe, expect, it, vi } from 'vitest';
import { copyText } from '../../src/lib/clipboard';
import { safeFilename } from '../../src/lib/download';
import { joinTags, parseTags } from '../../src/lib/tags';

describe('tags', () => {
  it('parses and joins the maindata tag format', () => {
    expect(parseTags('keep, hd')).toEqual(['keep', 'hd']);
    expect(joinTags(['keep', 'hd'])).toBe('keep, hd');
  });
});

describe('copyText', () => {
  it('uses the Clipboard API when available', async () => {
    const writeText = vi.fn(async () => {});
    await copyText('abc', { clipboard: { writeText } } as unknown as Navigator);
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('falls back to execCommand on insecure origins', async () => {
    const exec = vi.fn(() => true);
    const doc = Object.assign(document, { execCommand: exec });
    await copyText('abc', { clipboard: undefined } as unknown as Navigator, doc);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('fails loudly when nothing can copy', async () => {
    const doc = Object.assign(document, { execCommand: () => false });
    await expect(copyText('abc', { clipboard: undefined } as unknown as Navigator, doc)).rejects.toThrow('Clipboard unavailable');
  });
});

describe('safeFilename', () => {
  it('replaces path and control characters', () => {
    expect(safeFilename('a/b:c*?"<>|d')).toBe('a_b_c______d');
    expect(safeFilename('   ')).toBe('torrent');
  });
});
