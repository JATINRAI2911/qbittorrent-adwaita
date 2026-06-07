import { errorText, type ToastApi } from '../../commands/mutate';
import { WRITE_ONLY, type PrefDef, type Prefs } from './schema';
import { fromUi, sameAsServer, toUi } from './values';

export interface PreferencesModelDeps {
  api: { preferences(): Promise<Prefs>; setPreferences(changes: Prefs): Promise<void> };
  toast: ToastApi;
  /** Asked before a dangerous change is sent; resolve false to cancel it. */
  confirm(def: PrefDef, from: unknown, to: unknown): Promise<boolean>;
  debounceMs?: number;
  /** Called after the server accepted a change (e.g. to say where the Web UI moved). */
  onapplied?(def: PrefDef, changes: Prefs): void;
}

interface Pending {
  def: PrefDef;
  changes: Prefs;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * One Preferences dialog's state: instant apply, no Save button. Switches and combos
 * apply at once; entries and spins debounce and flush on blur or close. A failure restores the
 * server value of exactly the keys that request carried.
 */
export class PreferencesModel {
  server = $state.raw<Prefs | null>(null);
  /** Local edits not yet confirmed by the server, shown over the server values. */
  draft = $state.raw<Prefs>({});
  error = $state<string | null>(null);
  readonly values = $derived({ ...(this.server ?? {}), ...this.draft });

  readonly #deps: PreferencesModelDeps;
  readonly #pending = new Map<string, Pending>();

  constructor(deps: PreferencesModelDeps) {
    this.#deps = deps;
  }

  async load(): Promise<boolean> {
    this.error = null;
    try {
      this.server = await this.#deps.api.preferences();
      return true;
    } catch (error) {
      this.error = errorText(error);
      return false;
    }
  }

  ui(def: PrefDef): unknown {
    return toUi(def, this.values);
  }

  visible(def: PrefDef): boolean {
    return def.visibleWhen ? def.visibleWhen(this.values) : true;
  }

  enabled(def: PrefDef): boolean {
    return def.enabledWhen ? def.enabledWhen(this.values) : true;
  }

  edit(def: PrefDef, ui: unknown, { debounce = false }: { debounce?: boolean } = {}): void {
    if (!this.server) return;
    const changes = fromUi(def, ui, this.values);
    this.#cancel(def.key);
    if (sameAsServer(changes, this.server)) {
      this.#drop(Object.keys(changes));
      return;
    }
    this.draft = { ...this.draft, ...changes };
    if (!debounce) {
      void this.#apply(def, changes);
      return;
    }
    const timer = setTimeout(() => {
      this.#pending.delete(def.key);
      void this.#apply(def, changes);
    }, this.#deps.debounceMs ?? 600);
    this.#pending.set(def.key, { def, changes, timer });
  }

  /** Send every debounced change now (on blur, page change and close). */
  async flush(): Promise<void> {
    const pending = [...this.#pending.values()];
    for (const { timer } of pending) clearTimeout(timer);
    this.#pending.clear();
    await Promise.all(pending.map(({ def, changes }) => this.#apply(def, changes)));
  }

  async #apply(def: PrefDef, changes: Prefs): Promise<boolean> {
    const keys = Object.keys(changes);
    if (def.dangerous) {
      const from = toUi(def, this.server ?? {});
      const to = toUi(def, { ...(this.server ?? {}), ...changes });
      if ((def.dangerousWhen?.(from, to) ?? true) && !(await this.#deps.confirm(def, from, to))) {
        this.#drop(keys, changes);
        return false;
      }
    }
    try {
      await this.#deps.api.setPreferences(changes);
    } catch (error) {
      this.#drop(keys, changes);
      this.#deps.toast.show({ title: `Couldn’t change “${def.label}”: ${errorText(error)}` });
      return false;
    }
    const stored = Object.fromEntries(Object.entries(changes).filter(([key]) => !WRITE_ONLY.includes(key)));
    this.server = { ...(this.server ?? {}), ...stored };
    this.#drop(keys, changes);
    this.#deps.onapplied?.(def, changes);
    return true;
  }

  #cancel(key: string): void {
    const pending = this.#pending.get(key);
    if (pending) clearTimeout(pending.timer);
    this.#pending.delete(key);
  }

  /** Forget local edits of `keys`, but only those still holding what was sent (newer edits win). */
  #drop(keys: string[], sent?: Prefs): void {
    const draft = { ...this.draft };
    for (const key of keys) {
      if (!sent || JSON.stringify(draft[key]) === JSON.stringify(sent[key])) delete draft[key];
    }
    this.draft = draft;
  }
}
