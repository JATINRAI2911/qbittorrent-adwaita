export interface SpeedSample {
  /** Epoch milliseconds. */
  t: number;
  dl: number;
  ul: number;
}

export const HISTORY_MS = 60_000;

/** The last minute of global speeds, one sample per sync. */
export class SpeedHistory {
  samples = $state.raw<SpeedSample[]>([]);

  push(sample: SpeedSample): void {
    const cutoff = sample.t - HISTORY_MS;
    // `<= sample.t` too: after the clock jumps back, older "future" samples would bend the graph.
    this.samples = [...this.samples.filter((s) => s.t >= cutoff && s.t <= sample.t), sample];
  }

  clear(): void {
    this.samples = [];
  }
}
