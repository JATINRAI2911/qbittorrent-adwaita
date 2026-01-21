export type ThemePreference = 'system' | 'light' | 'dark';

/** libadwaita 1.6+ accent presets (`--accent-*` in _colors.scss). */
export const ACCENTS = {
  blue: '#3584e4',
  teal: '#2190a4',
  green: '#3a944a',
  yellow: '#c88800',
  orange: '#ed5b00',
  red: '#e62d42',
  pink: '#d56199',
  purple: '#9141ac',
  slate: '#6f8396',
} as const;
export type Accent = keyof typeof ACCENTS;

export interface ThemeSettings {
  preference: ThemePreference;
  accent: Accent;
}

const STORAGE_KEY = 'adw-ui.theme';
const FALLBACK: ThemeSettings = { preference: 'system', accent: 'blue' };

export function loadThemeSettings(storage: Pick<Storage, 'getItem'> | undefined): ThemeSettings {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<ThemeSettings>;
      if (
        (value.preference === 'system' || value.preference === 'light' || value.preference === 'dark') &&
        typeof value.accent === 'string' &&
        value.accent in ACCENTS
      ) {
        return { preference: value.preference, accent: value.accent };
      }
    }
  } catch {
    // unreadable storage (private mode, blocked cookies) or corrupt JSON: use the fallback
  }
  return { ...FALLBACK };
}

export function saveThemeSettings(storage: Pick<Storage, 'setItem'> | undefined, settings: ThemeSettings): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore: theme persistence is a convenience
  }
}

export function resolveScheme(preference: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

export function applyTheme(root: HTMLElement, settings: ThemeSettings, prefersDark: boolean): void {
  root.dataset.scheme = resolveScheme(settings.preference, prefersDark);
  root.style.setProperty('--accent-bg-color', ACCENTS[settings.accent]);
}

export function initTheme(win: Window = window): () => void {
  let storage: Storage | undefined;
  try {
    storage = win.localStorage;
  } catch {
    storage = undefined;
  }
  const settings = loadThemeSettings(storage);
  const query = win.matchMedia?.('(prefers-color-scheme: dark)');
  const update = () => applyTheme(win.document.documentElement, settings, query?.matches ?? false);
  update();
  query?.addEventListener('change', update);
  return () => query?.removeEventListener('change', update);
}
