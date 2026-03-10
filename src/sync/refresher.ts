export interface RefresherOptions {
  intervalMs: number;
  isHidden(): boolean;
  /** Calls back when the page becomes visible; returns an unsubscribe function. */
  onVisible(callback: () => void): () => void;
}

/**
 * Runs `task` now and every `intervalMs` after the previous run ends, one at a time, while started.
 * Skips runs while the page is hidden and runs as soon as it's visible again. A run from before the
 * latest start()/stop() is told it's stale through `isCurrent`.
 */
export class Refresher {
  #timer: ReturnType<typeof setTimeout> | undefined;
  #generation = 0;
  #running = false;
  #inFlight = false;
  #unlisten: (() => void) | undefined;

  constructor(
    private readonly task: (isCurrent: () => boolean) => Promise<void>,
    private readonly options: RefresherOptions,
  ) {}

  get running(): boolean {
    return this.#running;
  }

  start(): void {
    this.stop();
    this.#running = true;
    const generation = this.#generation;
    this.#unlisten = this.options.onVisible(() => this.pokeNow());
    void this.#tick(generation);
  }

  stop(): void {
    this.#running = false;
    this.#generation++;
    this.#inFlight = false;
    clearTimeout(this.#timer);
    this.#unlisten?.();
    this.#unlisten = undefined;
  }

  pokeNow(): void {
    if (!this.#running || this.#inFlight) return;
    clearTimeout(this.#timer);
    void this.#tick(this.#generation);
  }

  async #tick(generation: number): Promise<void> {
    if (!this.#running || generation !== this.#generation || this.#inFlight) return;
    if (this.options.isHidden()) return; // resumed by onVisible
    this.#inFlight = true;
    try {
      await this.task(() => generation === this.#generation);
    } catch {
      // the task reports its own errors; keep refreshing
    } finally {
      if (generation === this.#generation) {
        this.#inFlight = false;
        this.#timer = setTimeout(() => void this.#tick(generation), this.options.intervalMs);
      }
    }
  }
}
