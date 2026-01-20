import { ApiError } from '../api/client';
import type { MaindataResponse } from '../api/types';

export const BACKOFF_SECONDS = [1, 2, 4, 8, 16, 30] as const;

export interface PollerOptions {
  fetch(): Promise<MaindataResponse>;
  apply(response: MaindataResponse): void;
  isHidden(): boolean;
  onOnline(): void;
  onAuthLost(): void;
  onOffline(retryInSeconds: number): void;
  intervalMs?: number;
  hiddenIntervalMs?: number;
}

/** One request at a time; fixed interval when healthy, exponential backoff when the server is unreachable. */
export class Poller {
  #options: Required<PollerOptions>;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #running = false;
  #inFlight = false;
  #failures = 0;

  constructor(options: PollerOptions) {
    this.#options = { intervalMs: 1000, hiddenIntervalMs: 5000, ...options };
  }

  get running(): boolean {
    return this.#running;
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#failures = 0;
    void this.#tick();
  }

  stop(): void {
    this.#running = false;
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  pokeNow(): void {
    if (!this.#running) return;
    clearTimeout(this.#timer);
    void this.#tick();
  }

  async #tick(): Promise<void> {
    if (!this.#running || this.#inFlight) return;
    this.#inFlight = true;
    try {
      const response = await this.#options.fetch();
      if (!this.#running) return;
      try {
        this.#options.apply(response);
      } catch (error) {
        console.error('Failed to apply sync response', error);
      }
      this.#failures = 0;
      this.#options.onOnline();
      this.#schedule(this.#options.isHidden() ? this.#options.hiddenIntervalMs : this.#options.intervalMs);
    } catch (error) {
      if (!this.#running) return;
      if (error instanceof ApiError && (error.kind === 'auth' || error.kind === 'banned')) {
        this.stop();
        this.#options.onAuthLost();
        return;
      }
      const wait = BACKOFF_SECONDS[Math.min(this.#failures, BACKOFF_SECONDS.length - 1)]!;
      this.#failures++;
      this.#options.onOffline(wait);
      this.#schedule(wait * 1000);
    } finally {
      this.#inFlight = false;
    }
  }

  #schedule(ms: number): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.#tick(), ms);
  }
}
