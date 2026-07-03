import { LOG_TYPE, type LogMessage } from '../../api/log';
import { errorText } from '../../commands/mutate';

export interface LogModelDeps<T> {
  /** Entries with an id above `lastId`. */
  fetch(lastId: number): Promise<T[]>;
  isHidden(): boolean;
  onVisible(callback: () => void): () => void;
  pollMs?: number;
  /** Most entries kept; the oldest go first. */
  cap?: number;
}

/**
 * One log tab, polled incrementally by `last_known_id` while its dialog is open.
 * Pauses while the page is hidden; memory stays bounded however long it runs.
 */
export class LogModel<T extends { id: number }> {
  entries = $state.raw<T[]>([]);
  error = $state<string | null>(null);
  loading = $state(true);

  readonly #deps: LogModelDeps<T>;
  #lastId = -1;
  #running = false;
  #busy = false;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #unlisten: (() => void) | undefined;

  constructor(deps: LogModelDeps<T>) {
    this.#deps = deps;
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#unlisten = this.#deps.onVisible(() => void this.#tick());
    void this.#tick();
  }

  stop(): void {
    this.#running = false;
    clearTimeout(this.#timer);
    this.#unlisten?.();
    this.#unlisten = undefined;
  }

  async #tick(): Promise<void> {
    clearTimeout(this.#timer);
    if (!this.#running || this.#busy || this.#deps.isHidden()) return;
    this.#busy = true;
    try {
      const fresh = (await this.#deps.fetch(this.#lastId)).filter((entry) => entry.id > this.#lastId);
      if (!this.#running) return;
      if (fresh.length) {
        this.#lastId = fresh.at(-1)!.id;
        const next = [...this.entries, ...fresh];
        const cap = this.#deps.cap ?? 20_000;
        this.entries = next.length > cap ? next.slice(next.length - cap) : next;
      }
      this.error = null;
    } catch (error) {
      this.error = errorText(error);
    } finally {
      this.#busy = false;
      this.loading = false;
      if (this.#running) this.#timer = setTimeout(() => void this.#tick(), this.#deps.pollMs ?? 2000);
    }
  }
}

export type LogLevel = 'all' | 'info' | 'warning' | 'critical';

const LEVEL_TYPES: Record<Exclude<LogLevel, 'all'>, number> = {
  info: LOG_TYPE.normal | LOG_TYPE.info,
  warning: LOG_TYPE.warning,
  critical: LOG_TYPE.critical,
};

export const words = (query: string) => query.toLocaleLowerCase().split(/\s+/).filter(Boolean);

/** Messages of one level (info covers normal and info), containing every query word. */
export function filterMessages(entries: readonly LogMessage[], level: LogLevel, query: string): LogMessage[] {
  const needles = words(query);
  return entries.filter(
    (entry) =>
      (level === 'all' || (entry.type & LEVEL_TYPES[level]) !== 0) &&
      needles.every((needle) => entry.message.toLocaleLowerCase().includes(needle)),
  );
}
