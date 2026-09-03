import { SvelteSet } from 'svelte/reactivity';
import type { AddApi, ContentLayout, StopCondition, TorrentMetadata } from '../../api/add';
import { errorText } from '../../commands/mutate';
import { isTorrentFile, parseSources } from './sources';

export type ItemStatus = 'loading' | 'ready' | 'waiting' | 'duplicate' | 'error';

export interface AddItem {
  id: number;
  kind: 'magnet' | 'url' | 'file';
  label: string;
  source: string | File;
  hash: string | null;
  status: ItemStatus;
  metadata: TorrentMetadata | null;
  error: string | null;
}

export interface AddForm {
  category: string;
  autoTMM: boolean;
  savePath: string;
  useDownloadPath: boolean;
  downloadPath: string;
  tags: string[];
  start: boolean;
  contentLayout: ContentLayout;
  stopCondition: StopCondition;
  skipChecking: boolean;
  sequential: boolean;
  firstLast: boolean;
  addToTop: boolean;
  rename: string;
  dlLimitKiB: number;
  upLimitKiB: number;
}

const URL_ATTEMPTS = 8;
/** Form fields whose initial value is only a guess until app/preferences answers. */
const SERVER_DEFAULTED: (keyof AddForm)[] = ['autoTMM', 'savePath', 'start', 'contentLayout', 'stopCondition', 'addToTop'];
const LAYOUTS: ContentLayout[] = ['Original', 'Subfolder', 'NoSubfolder'];
const CONDITIONS: StopCondition[] = ['None', 'MetadataReceived', 'FilesChecked'];

/** Add-dialog defaults from `app/preferences`; unknown or missing values are left out. */
export function defaultsFromPreferences(prefs: Record<string, unknown>): Partial<AddForm> {
  const out: Partial<AddForm> = {};
  if (typeof prefs.save_path === 'string') out.savePath = prefs.save_path;
  if (typeof prefs.temp_path_enabled === 'boolean') out.useDownloadPath = prefs.temp_path_enabled;
  if (typeof prefs.temp_path === 'string') out.downloadPath = prefs.temp_path;
  if (typeof prefs.auto_tmm_enabled === 'boolean') out.autoTMM = prefs.auto_tmm_enabled;
  if (typeof prefs.add_stopped_enabled === 'boolean') out.start = !prefs.add_stopped_enabled;
  if (typeof prefs.add_to_top_of_queue === 'boolean') out.addToTop = prefs.add_to_top_of_queue;
  if (LAYOUTS.includes(prefs.torrent_content_layout as ContentLayout)) out.contentLayout = prefs.torrent_content_layout as ContentLayout;
  if (CONDITIONS.includes(prefs.torrent_stop_condition as StopCondition)) out.stopCondition = prefs.torrent_stop_condition as StopCondition;
  return out;
}

export interface AddModelDeps {
  api: Pick<AddApi, 'fetchMetadata' | 'parseMetadata'>;
  /** True when a torrent with this id is already in the list. */
  has(hash: string): boolean;
  pollMs?: number;
}

/** State of one Add Torrents dialog. Create per dialog; call dispose() when it closes. */
export class AddModel {
  items = $state<AddItem[]>([]);
  invalid = $state<string[]>([]);
  readonly skipped = new SvelteSet<number>();
  form = $state<AddForm>({
    category: '',
    autoTMM: false,
    savePath: '',
    useDownloadPath: false,
    downloadPath: '',
    tags: [],
    start: true,
    contentLayout: 'Original',
    stopCondition: 'None',
    skipChecking: false,
    sequential: false,
    firstLast: false,
    addToTop: false,
    rename: '',
    dlLimitKiB: 0,
    upLimitKiB: 0,
  });

  readonly #deps: AddModelDeps;
  readonly #edited = new Set<keyof AddForm>();
  readonly #timers = new Set<ReturnType<typeof setTimeout>>();
  #nextId = 0;
  #selectionFor: number | null = null;
  #disposed = false;

  constructor(deps: AddModelDeps) {
    this.#deps = deps;
  }

  /** Items that will be sent: everything but duplicates. Failed previews can still be added (qBittorrent retries). */
  get addable(): AddItem[] {
    const hashes = new Set<string>();
    return this.items.filter((item) => {
      if (item.status === 'duplicate') return false;
      if (!item.hash) return true;
      if (hashes.has(item.hash)) return false; // the same torrent twice (a magnet and its file) is sent once
      hashes.add(item.hash);
      return true;
    });
  }

  get single(): AddItem | null {
    return this.addable.length === 1 ? this.addable[0]! : null;
  }

  get canSelectFiles(): boolean {
    return (this.single?.metadata?.info.files.length ?? 0) > 1;
  }

  addText(text: string): number {
    const { sources, invalid } = parseSources(text);
    this.invalid = invalid;
    let added = 0;
    for (const source of sources) {
      if (this.items.some((item) => (item.hash && item.hash === source.hash) || item.source === source.value)) continue;
      const item = this.#push({ kind: source.kind, label: source.label, source: source.value, hash: source.hash });
      added++;
      if (item.hash && this.#deps.has(item.hash)) this.#update(item.id, { status: 'duplicate' });
      else void this.#fetch(item.id, source.value);
    }
    return added;
  }

  addFiles(files: readonly File[]): number {
    const torrents = files.filter(isTorrentFile);
    if (!torrents.length) return 0;
    const ids = torrents.map((file) => this.#push({ kind: 'file', label: file.name, source: file, hash: null }).id);
    void this.#parse(ids, torrents);
    return torrents.length;
  }

  remove(id: number): void {
    this.items = this.items.filter((item) => item.id !== id);
    this.#syncSelection();
  }

  setSkipped(ids: readonly number[], skip: boolean): void {
    this.#selectionFor = this.single?.id ?? null;
    for (const id of ids) {
      if (skip) this.skipped.add(id);
      else this.skipped.delete(id);
    }
  }

  #defaultsLoaded = $state(false);

  /** Mark items already in the list as duplicates (call right before adding: time has passed). */
  recheckDuplicates(): void {
    for (const item of this.items) if (item.hash && item.status !== 'duplicate' && this.#deps.has(item.hash)) this.#update(item.id, { status: 'duplicate' });
  }

  markEdited(field: keyof AddForm): void {
    this.#edited.add(field);
  }

  /** Until the server defaults arrive (they may never, if app/preferences fails): options to leave
   *  out of the request, so qBittorrent applies its own rather than this dialog's guesses. */
  get unknownDefaults(): ReadonlySet<keyof AddForm> {
    if (this.#defaultsLoaded) return new Set();
    return new Set(SERVER_DEFAULTED.filter((field) => !this.#edited.has(field)));
  }

  /** Server defaults arrive after the dialog opens; never overwrite a field the user touched. */
  applyDefaults(defaults: Partial<AddForm>): void {
    this.#defaultsLoaded = true;
    for (const [key, value] of Object.entries(defaults) as [keyof AddForm, never][]) {
      if (!this.#edited.has(key)) this.form[key] = value;
    }
  }

  dispose(): void {
    this.#disposed = true;
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers.clear();
  }

  /** File indices only mean something for the torrent they were chosen in. */
  #syncSelection(): void {
    if (this.single?.id === this.#selectionFor) return;
    this.skipped.clear();
    this.#selectionFor = null;
  }

  #push(fields: Pick<AddItem, 'kind' | 'label' | 'source' | 'hash'>): AddItem {
    const item: AddItem = { id: ++this.#nextId, status: 'loading', metadata: null, error: null, ...fields };
    this.items = [...this.items, item];
    this.#syncSelection();
    return item;
  }

  #update(id: number, patch: Partial<AddItem>): void {
    this.items = this.items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    this.#syncSelection();
  }

  #alive(id: number): boolean {
    return !this.#disposed && this.items.some((item) => item.id === id);
  }

  /**
   * Polls with backoff (1×, 1.5×, 2.25×… capped at 5× pollMs). A URL whose download fails also reads
   * as pending (qBittorrent retries it on every poll), so URLs give up after URL_ATTEMPTS: hammering
   * a private tracker's download.php gets accounts throttled or banned.
   */
  async #fetch(id: number, source: string, attempt = 0): Promise<void> {
    try {
      const result = await this.#deps.api.fetchMetadata(source);
      if (!this.#alive(id)) return;
      if (result.pending) {
        const kind = this.items.find((item) => item.id === id)?.kind;
        if (kind === 'url' && attempt + 1 >= URL_ATTEMPTS) {
          this.#update(id, { status: 'error', error: 'Couldn’t download the torrent file' });
          return;
        }
        this.#update(id, { status: 'waiting' });
        const timer = setTimeout(() => {
          this.#timers.delete(timer);
          void this.#fetch(id, source, attempt + 1);
        }, (this.#deps.pollMs ?? 1000) * Math.min(1.5 ** attempt, 5));
        this.#timers.add(timer);
        return;
      }
      const hash = result.metadata.hash || this.items.find((item) => item.id === id)?.hash || null;
      const duplicate = hash !== null && this.#deps.has(hash);
      this.#update(id, { status: duplicate ? 'duplicate' : 'ready', metadata: result.metadata, hash, label: result.metadata.info.name || this.items.find((i) => i.id === id)!.label });
    } catch (error) {
      if (this.#alive(id)) this.#update(id, { status: 'error', error: errorText(error) });
    }
  }

  async #parse(ids: number[], files: File[]): Promise<void> {
    try {
      const metas = await this.#deps.api.parseMetadata(files);
      if (this.#disposed) return;
      ids.forEach((id, i) => {
        const meta = metas[i];
        if (!meta || !this.#alive(id)) return;
        const duplicate = this.#deps.has(meta.hash);
        this.#update(id, { status: duplicate ? 'duplicate' : 'ready', metadata: meta, hash: meta.hash, label: meta.info.name });
      });
    } catch (error) {
      if (this.#disposed) return;
      for (const id of ids) if (this.#alive(id)) this.#update(id, { status: 'error', error: errorText(error) });
    }
  }
}
