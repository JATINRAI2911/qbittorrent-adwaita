import { errorText, type ToastApi } from '../../commands/mutate';
import { WRITE_ONLY, type PrefDef, type Prefs } from './schema';
import { fromUi, toUi } from './values';

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
  /** Null for commit-only rows: sent by flush() (Enter, blur, page change, close). */
  timer: ReturnType<typeof setTimeout> | null;
}

export interface EditOptions {
  /** Entries and spins: send 600 ms after the last change. */
  debounce?: boolean;
  /** Paths and dangerous rows: never send a half-typed value; wait for flush(). */
  commit?: boolean;
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
  /** Per key: why the typed value isn't sent (shown under its row). */
  errors = $state.raw<Record<string, string>>({});
  readonly values = $derived({ ...(this.server ?? {}), ...this.draft });

  readonly #deps: PreferencesModelDeps;
  readonly #pending = new Map<string, Pending>();
  /** Values sent but not yet answered: a quick undo compares against these, not the stale server copy. */
  readonly #inflight = new Map<string, unknown>();
  /** Per key, the newest request touching it: an older answer arriving late never overwrites it. */
  readonly #latest = new Map<string, number>();
  #sends = 0;

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

  edit(def: PrefDef, ui: unknown, options: EditOptions = {}): void {
    if (!this.server) return;
    // An emptied write-only field (the password) means “leave it unchanged”, never “set it empty”.
    if (WRITE_ONLY.includes(def.key) && ui === '') {
      this.#cancel(def.key);
      this.#drop([def.key]);
      this.#setError(def.key, null);
      return;
    }
    const error = def.validate?.(ui, this.values) ?? null;
    this.#setError(def.key, error);
    if (error) {
      this.#cancel(def.key);
      if (options.debounce || options.commit) {
        this.draft = { ...this.draft, ...fromUi(def, ui, this.values) };
      } else {
        this.#deps.toast.show({ title: `${ui === true ? 'Can’t turn on' : 'Can’t change'} “${def.label}”: ${error}` });
      }
      return;
    }
    this.editChanges(def, fromUi(def, ui, this.values), options);
  }

  /** Apply API-shaped changes on behalf of `def` (widgets that set several keys, or objects). */
  editChanges(def: PrefDef, changes: Prefs, { debounce = false, commit = false }: EditOptions = {}): void {
    if (!this.server) return;
    this.#cancel(def.key);
    if (this.#unchanged(changes)) {
      this.#drop(Object.keys(changes));
      return;
    }
    this.draft = { ...this.draft, ...changes };
    if (commit) {
      this.#pending.set(def.key, { def, changes, timer: null });
      return;
    }
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
    for (const { timer } of pending) if (timer) clearTimeout(timer);
    this.#pending.clear();
    await Promise.all(pending.map(({ def, changes }) => this.#apply(def, changes)));
  }

  async #apply(def: PrefDef, changes: Prefs): Promise<boolean> {
    const keys = Object.keys(changes);
    // Claim the keys first: a value waiting for confirmation counts as sent, so committing it again
    // (focus moving into the alert blurs the field) doesn't open a second confirmation.
    const send = ++this.#sends;
    for (const key of keys) {
      this.#inflight.set(key, changes[key]);
      this.#latest.set(key, send);
    }
    // Keys a newer request has taken over since: this answer no longer speaks for them.
    const current = () => keys.filter((key) => this.#latest.get(key) === send);
    if (def.dangerous) {
      const from = toUi(def, this.server ?? {});
      const to = toUi(def, { ...(this.server ?? {}), ...changes });
      if ((def.dangerousWhen?.(from, to, this.values) ?? true) && !(await this.#deps.confirm(def, from, to))) {
        const own = current();
        for (const key of own) this.#inflight.delete(key);
        this.#drop(own, changes);
        return false;
      }
    }
    try {
      await this.#deps.api.setPreferences(changes);
    } catch (error) {
      const own = current();
      for (const key of own) this.#inflight.delete(key);
      this.#drop(own, changes);
      if (own.length) this.#deps.toast.show({ title: `Couldn’t change “${def.label}”: ${errorText(error)}` });
      return false;
    }
    const own = current();
    for (const key of own) this.#inflight.delete(key);
    const stored = Object.fromEntries(own.filter((key) => !WRITE_ONLY.includes(key)).map((key) => [key, changes[key]]));
    this.server = { ...(this.server ?? {}), ...stored };
    this.#drop(own, changes);
    this.#deps.onapplied?.(def, changes);
    return true;
  }

  #unchanged(changes: Prefs): boolean {
    return Object.entries(changes).every(([key, value]) => {
      const baseline = this.#inflight.has(key) ? this.#inflight.get(key) : this.server?.[key];
      return JSON.stringify(baseline) === JSON.stringify(value);
    });
  }

  #setError(key: string, error: string | null): void {
    if ((this.errors[key] ?? null) === error) return;
    const errors = { ...this.errors };
    if (error) errors[key] = error;
    else delete errors[key];
    this.errors = errors;
  }

  #cancel(key: string): void {
    const pending = this.#pending.get(key);
    if (pending?.timer) clearTimeout(pending.timer);
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
