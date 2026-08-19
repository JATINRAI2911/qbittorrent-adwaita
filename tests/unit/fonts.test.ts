import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('fonts', () => {
  it('ships every face as WOFF2, and the files exist', () => {
    const css = readFileSync('src/ui/adw/fonts.css', 'utf8');
    const urls = [...css.matchAll(/url\("\.\/(fonts\/[^"]+)"\)\s*format\("([^"]+)"\)/g)];
    expect(urls).toHaveLength(4);
    for (const [, file, format] of urls) {
      expect(format, file).toBe('woff2');
      expect(file!.endsWith('.woff2'), file).toBe(true);
      expect(existsSync(`src/ui/adw/${file}`), file).toBe(true);
    }
  });
});
