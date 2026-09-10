import { HIDDEN_PAGES, PAGES, type PrefDef, type Prefs } from './schema';

export interface SearchResult {
  def: PrefDef;
  /** Hidden by another setting right now: shown dimmed, with what it needs (def.needs). */
  dimmed: boolean;
}

const words = (query: string) => query.toLocaleLowerCase().split(/\s+/).filter(Boolean);

/** Every row matching all query words in its label, subtitle or key, in page then schema order. */
export function searchPreferences(query: string, defs: readonly PrefDef[], prefs: Prefs): SearchResult[] {
  const needles = words(query);
  if (!needles.length) return [];
  const order = new Map(PAGES.map((page, i) => [page.id, i]));
  return defs
    .filter((def) => !HIDDEN_PAGES.includes(def.page) && def.kind !== 'subpage')
    .filter((def) => {
      const haystack = `${def.label} ${def.subtitle ?? ''} ${def.key}`.toLocaleLowerCase();
      return needles.every((needle) => haystack.includes(needle));
    })
    .map((def, index) => ({ def, index, dimmed: def.visibleWhen ? !def.visibleWhen(prefs) : false }))
    .sort((a, b) => order.get(a.def.page)! - order.get(b.def.page)! || a.index - b.index)
    .map(({ def, dimmed }) => ({ def, dimmed }));
}
