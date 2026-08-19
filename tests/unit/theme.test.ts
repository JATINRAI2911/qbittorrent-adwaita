import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACCENTS, applyTheme, loadThemeSettings, resolveScheme } from '../../src/ui/theme';

describe('resolveScheme', () => {
  it('follows the system only when asked to', () => {
    expect(resolveScheme('system', true)).toBe('dark');
    expect(resolveScheme('system', false)).toBe('light');
    expect(resolveScheme('light', true)).toBe('light');
    expect(resolveScheme('dark', false)).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('sets data-scheme and the accent custom property on the root', () => {
    const root = document.createElement('html');
    applyTheme(root, { preference: 'system', accent: 'purple' }, true);
    expect(root.dataset.scheme).toBe('dark');
    expect(root.style.getPropertyValue('--accent-bg-color')).toBe(ACCENTS.purple);
  });
});

describe('loadThemeSettings', () => {
  it('reads valid saved settings', () => {
    const storage = { getItem: () => JSON.stringify({ preference: 'dark', accent: 'teal' }) };
    expect(loadThemeSettings(storage)).toEqual({ preference: 'dark', accent: 'teal' });
  });

  it('falls back to system + blue for missing, invalid or throwing storage', () => {
    const fallback = { preference: 'system', accent: 'blue' };
    expect(loadThemeSettings(undefined)).toEqual(fallback);
    expect(loadThemeSettings({ getItem: () => 'not json' })).toEqual(fallback);
    expect(loadThemeSettings({ getItem: () => JSON.stringify({ preference: 'neon', accent: 'blue' }) })).toEqual(fallback);
    expect(
      loadThemeSettings({
        getItem: () => {
          throw new Error('SecurityError');
        },
      }),
    ).toEqual(fallback);
  });
});

describe('loadThemeSettings', () => {
  it('ignores an accent that is only an inherited property name', () => {
    const storage = { getItem: () => JSON.stringify({ preference: 'dark', accent: 'toString' }) };
    expect(loadThemeSettings(storage)).toEqual({ preference: 'system', accent: 'blue' });
  });
});

describe('static/theme-boot.js (before first paint)', () => {
  const boot = readFileSync('static/theme-boot.js', 'utf8');
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-scheme');
    document.documentElement.style.removeProperty('--accent-bg-color');
  });

  it.each([
    [JSON.stringify({ preference: 'dark', accent: 'teal' }), false],
    [JSON.stringify({ preference: 'system', accent: 'purple' }), true],
    [JSON.stringify({ preference: 'light', accent: 'red' }), true],
    ['not json', true],
    [null, false],
  ])('applies the same scheme and accent as the app would (%s, system dark: %s)', (stored, prefersDark) => {
    vi.stubGlobal('localStorage', { getItem: () => stored });
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: prefersDark && query.includes('dark'), media: query }));
    new Function(boot)();
    const expected = document.createElement('html');
    applyTheme(expected, loadThemeSettings({ getItem: () => stored }), prefersDark);
    expect(document.documentElement.dataset.scheme).toBe(expected.dataset.scheme);
    expect(document.documentElement.style.getPropertyValue('--accent-bg-color')).toBe(expected.style.getPropertyValue('--accent-bg-color'));
  });

  it('knows every accent the app knows', () => {
    for (const [name, color] of Object.entries(ACCENTS)) expect(boot, name).toContain(`${name}: '${color}'`);
  });

  it('is loaded as a classic script in the head, before the app', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html.indexOf('theme-boot.js')).toBeGreaterThan(0);
    expect(html.indexOf('theme-boot.js')).toBeLessThan(html.indexOf('</head>'));
  });
});

