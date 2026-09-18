import type { ClientDataApi } from '../api/clientdata';
import { COLUMN_IDS, DEFAULT_COLUMNS, isColumnId, type ColumnId, type TableSort } from '../features/table/columns';
import { LIST_SORTS, type ListSort } from './groups';

export type ViewMode = 'list' | 'table';

export interface UiPrefsData {
  view: ViewMode;
  listSort: ListSort;
  tableSort: TableSort;
  columns: ColumnId[];
  /** details sheet height as a fraction of the window */
  sheetHeight: number;
}

export const PREFS_KEY = 'adwaita-ui';
const STORAGE_KEY = 'adw-ui.prefs';

export const DEFAULT_PREFS: UiPrefsData = {
  view: 'list',
  listSort: 'activity',
  tableSort: { column: 'added', descending: true },
  columns: [...DEFAULT_COLUMNS],
  sheetHeight: 0.5,
};

const withName = (columns: ColumnId[]) => (columns.includes('name') ? columns : ['name' as const, ...columns]);

export const SHEET_MIN = 0.22;
export const SHEET_MAX = 0.92;
const clampSheet = (value: number) => Math.min(SHEET_MAX, Math.max(SHEET_MIN, value));
const KNOWN_KEYS = new Set(['view', 'listSort', 'tableSort', 'columns', 'sheetHeight', 'pending']);

/** Keys a newer or older build stored that this one doesn't know: kept and written back unchanged. */
function unknownKeys(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !KNOWN_KEYS.has(key)));
}

/** Accept whatever is stored, field by field; anything unknown falls back to the default. */
export function sanitizePrefs(raw: unknown): UiPrefsData {
  const value = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const sort = value.tableSort !== null && typeof value.tableSort === 'object' ? (value.tableSort as Record<string, unknown>) : {};
  return {
    view: value.view === 'table' ? 'table' : 'list',
    listSort: LIST_SORTS.some((s) => s.value === value.listSort) ? (value.listSort as ListSort) : DEFAULT_PREFS.listSort,
    tableSort:
      isColumnId(sort.column) && typeof sort.descending === 'boolean' ? { column: sort.column, descending: sort.descending } : { ...DEFAULT_PREFS.tableSort },
    columns: Array.isArray(value.columns) ? withName([...new Set(value.columns.filter(isColumnId))]) : [...DEFAULT_PREFS.columns],
    sheetHeight: typeof value.sheetHeight === 'number' && Number.isFinite(value.sheetHeight) ? clampSheet(value.sheetHeight) : DEFAULT_PREFS.sheetHeight,
  };
}

export interface PrefsDeps {
  api: Pick<ClientDataApi, 'load' | 'store'>;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  /** Server write debounce; 1 s by default. */
  delayMs?: number;
}

/** View state that survives reloads: stored in qBittorrent's clientdata, cached in localStorage. */
export class UiPrefs {
  view = $state<ViewMode>(DEFAULT_PREFS.view);
  listSort = $state<ListSort>(DEFAULT_PREFS.listSort);
  tableSort = $state<TableSort>({ ...DEFAULT_PREFS.tableSort });
  columns = $state<ColumnId[]>([...DEFAULT_PREFS.columns]);
  sheetHeight = $state(DEFAULT_PREFS.sheetHeight);
  #extra: Record<string, unknown> = {};
  readonly #deps: PrefsDeps;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #loading: Promise<void> | undefined;
  #dirty = false;
  /** Fields changed here since start: they win over the server copy, field by field. */
  readonly #changedFields = new Set<keyof UiPrefsData>();
  /** The local copy has changes the server hasn't confirmed (debounce pending, or a write failed). */
  #pending = false;

  constructor(deps: PrefsDeps) {
    this.#deps = deps;
    const local = this.#readLocal();
    this.#apply(local.data);
    this.#pending = local.pending;
    this.#extra = local.extra;
  }

  get data(): UiPrefsData {
    return { ...this.#extra, view: this.view, listSort: this.listSort, tableSort: { ...this.tableSort }, columns: [...this.columns], sheetHeight: this.sheetHeight };
  }

  /** Once per app: the server copy wins, unless the user already changed something meanwhile. */
  load(): Promise<void> {
    this.#loading ??= (async () => {
      try {
        // An unsynced local copy is newer than the server's (reloaded within the debounce, or the last
        // write failed): keep it and send it again instead of taking the older server copy.
        if (this.#pending) {
          if (!this.#dirty) await this.flush();
          return;
        }
        const result = await this.#deps.api.load([PREFS_KEY]);
        const raw = result[PREFS_KEY];
        // Only an object is a stored copy (null or junk would otherwise reset everything).
        if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
          const merged: UiPrefsData = sanitizePrefs(raw);
          const local = this.data;
          for (const field of this.#changedFields) (merged as unknown as Record<string, unknown>)[field] = local[field];
          this.#apply(merged);
          this.#extra = unknownKeys(raw);
          this.#writeLocal();
        }
      } catch {
        // server unavailable: keep the local copy
      }
    })();
    return this.#loading;
  }

  setView(view: ViewMode): void {
    this.view = view;
    this.#changed('view');
  }

  setListSort(sort: ListSort): void {
    this.listSort = sort;
    this.#changed('listSort');
  }

  setTableSort(sort: TableSort): void {
    this.tableSort = { ...sort };
    this.#changed('tableSort');
  }

  setColumns(columns: readonly ColumnId[]): void {
    this.columns = withName(COLUMN_IDS.filter((id) => columns.includes(id)));
    this.#changed('columns');
  }

  setSheetHeight(fraction: number): void {
    this.sheetHeight = clampSheet(fraction);
    this.#changed('sheetHeight');
  }

  toggleColumn(id: ColumnId): void {
    if (id === 'name') return;
    this.setColumns(this.columns.includes(id) ? this.columns.filter((c) => c !== id) : [...this.columns, id]);
  }

  /** Write to the server now. On failure the local copy stays marked unsynced, so the next load re-sends it. */
  async flush(): Promise<void> {
    clearTimeout(this.#timer);
    try {
      await this.#deps.api.store({ [PREFS_KEY]: this.data });
      this.#pending = false;
      this.#writeLocal();
    } catch {
      // best effort; localStorage already has it, marked unsynced
    }
  }

  /** For page hide: send a change still waiting on the debounce. */
  flushIfPending(): Promise<void> {
    return this.#pending ? this.flush() : Promise.resolve();
  }

  #changed(field: keyof UiPrefsData): void {
    this.#changedFields.add(field);
    this.#dirty = true;
    this.#pending = true;
    this.#writeLocal();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.flush(), this.#deps.delayMs ?? 1000);
  }

  #apply(data: UiPrefsData): void {
    this.view = data.view;
    this.listSort = data.listSort;
    this.tableSort = data.tableSort;
    this.columns = data.columns;
    this.sheetHeight = data.sheetHeight;
  }

  #readLocal(): { data: UiPrefsData; pending: boolean; extra: Record<string, unknown> } {
    try {
      const raw = this.#deps.storage?.getItem(STORAGE_KEY);
      const value: unknown = raw ? JSON.parse(raw) : null;
      const pending = value !== null && typeof value === 'object' && (value as { pending?: unknown }).pending === true;
      return { data: sanitizePrefs(value), pending, extra: unknownKeys(value) };
    } catch {
      return { data: sanitizePrefs(null), pending: false, extra: {} };
    }
  }

  #writeLocal(): void {
    try {
      this.#deps.storage?.setItem(STORAGE_KEY, JSON.stringify({ ...this.data, pending: this.#pending }));
    } catch {
      // storage blocked: the server copy still works
    }
  }
}
