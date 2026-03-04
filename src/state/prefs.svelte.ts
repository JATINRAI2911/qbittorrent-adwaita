import type { ClientDataApi } from '../api/clientdata';
import { COLUMN_IDS, DEFAULT_COLUMNS, isColumnId, type ColumnId, type TableSort } from '../features/table/columns';
import { LIST_SORTS, type ListSort } from './groups';

export type ViewMode = 'list' | 'table';

export interface UiPrefsData {
  view: ViewMode;
  listSort: ListSort;
  tableSort: TableSort;
  columns: ColumnId[];
}

export const PREFS_KEY = 'adwaita-ui';
const STORAGE_KEY = 'adw-ui.prefs';

export const DEFAULT_PREFS: UiPrefsData = {
  view: 'list',
  listSort: 'activity',
  tableSort: { column: 'added', descending: true },
  columns: [...DEFAULT_COLUMNS],
};

const withName = (columns: ColumnId[]) => (columns.includes('name') ? columns : ['name' as const, ...columns]);

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
  readonly #deps: PrefsDeps;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #loading: Promise<void> | undefined;
  #dirty = false;

  constructor(deps: PrefsDeps) {
    this.#deps = deps;
    this.#apply(this.#readLocal());
  }

  get data(): UiPrefsData {
    return { view: this.view, listSort: this.listSort, tableSort: { ...this.tableSort }, columns: [...this.columns] };
  }

  /** Once per app: the server copy wins, unless the user already changed something meanwhile. */
  load(): Promise<void> {
    this.#loading ??= (async () => {
      try {
        const result = await this.#deps.api.load([PREFS_KEY]);
        if (!this.#dirty && result[PREFS_KEY] !== undefined) {
          this.#apply(sanitizePrefs(result[PREFS_KEY]));
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
    this.#changed();
  }

  setListSort(sort: ListSort): void {
    this.listSort = sort;
    this.#changed();
  }

  setTableSort(sort: TableSort): void {
    this.tableSort = { ...sort };
    this.#changed();
  }

  setColumns(columns: readonly ColumnId[]): void {
    this.columns = withName(COLUMN_IDS.filter((id) => columns.includes(id)));
    this.#changed();
  }

  toggleColumn(id: ColumnId): void {
    if (id === 'name') return;
    this.setColumns(this.columns.includes(id) ? this.columns.filter((c) => c !== id) : [...this.columns, id]);
  }

  /** Write to the server now (tests, page hide). */
  async flush(): Promise<void> {
    clearTimeout(this.#timer);
    try {
      await this.#deps.api.store({ [PREFS_KEY]: this.data });
    } catch {
      // best effort; localStorage already has it
    }
  }

  #changed(): void {
    this.#dirty = true;
    this.#writeLocal();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.flush(), this.#deps.delayMs ?? 1000);
  }

  #apply(data: UiPrefsData): void {
    this.view = data.view;
    this.listSort = data.listSort;
    this.tableSort = data.tableSort;
    this.columns = data.columns;
  }

  #readLocal(): UiPrefsData {
    try {
      const raw = this.#deps.storage?.getItem(STORAGE_KEY);
      return sanitizePrefs(raw ? JSON.parse(raw) : null);
    } catch {
      return sanitizePrefs(null);
    }
  }

  #writeLocal(): void {
    try {
      this.#deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // storage blocked: the server copy still works
    }
  }
}
