import { describe, expect, it } from 'vitest';
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
