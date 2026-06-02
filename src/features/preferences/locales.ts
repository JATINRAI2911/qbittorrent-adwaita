/** The languages qBittorrent 5.2 ships translations for (its `locale` preference values). */
export const LOCALES = [
  'ar', 'az@latin', 'be', 'bg', 'ca', 'cs', 'da', 'de', 'el', 'en', 'en_AU', 'en_GB', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'gl',
  'he', 'hi_IN', 'hr', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'ka', 'ko', 'lt', 'ltg', 'lv_LV', 'mn_MN', 'ms_MY', 'nb', 'nl', 'oc', 'pl',
  'pt_BR', 'pt_PT', 'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'th', 'tr', 'uk', 'uz@Latn', 'vi', 'zh_CN', 'zh_HK', 'zh_TW',
];

const tag = (code: string) => code.replace(/@.*/, '').replace('_', '-');

function name(code: string, locale: string): string | undefined {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(tag(code));
  } catch {
    return undefined;
  }
}

/** “German (Deutsch)”: the English name, and the language's own name when it differs. */
export function localeLabel(code: string): string {
  const english = name(code, 'en') ?? code;
  const native = name(code, tag(code));
  return native && native.toLocaleLowerCase() !== english.toLocaleLowerCase() ? `${english} (${native})` : english;
}

/** Combo options, keeping an unknown current value selectable. */
export function localeOptions(current: string): { value: string; label: string }[] {
  const codes = LOCALES.includes(current) || !current ? LOCALES : [current, ...LOCALES];
  return codes.map((code) => ({ value: code, label: localeLabel(code) })).sort((a, b) => a.label.localeCompare(b.label));
}
