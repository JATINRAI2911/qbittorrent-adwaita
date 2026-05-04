/** A cached copy of app/preferences for the few values the main window needs (save path, port, limits). */
export class ServerPrefs {
  values = $state.raw<Record<string, unknown> | null>(null);
  readonly #load: () => Promise<Record<string, unknown>>;
  #pending: Promise<boolean> | null = null;

  constructor(load: () => Promise<Record<string, unknown>>) {
    this.#load = load;
  }

  /** Concurrent callers share one request. Resolves false on failure, which keeps the previous values. */
  refresh(): Promise<boolean> {
    this.#pending ??= this.#load()
      .then((values) => {
        this.values = values;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        this.#pending = null;
      });
    return this.#pending;
  }

  get savePath(): string | null {
    const value = this.values?.save_path;
    return typeof value === 'string' && value ? value : null;
  }

  get listenPort(): number | null {
    const value = this.values?.listen_port;
    return typeof value === 'number' && value > 0 ? value : null;
  }
}
