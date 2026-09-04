import { describe, expect, it } from 'vitest';
import { HISTORY_MS, SpeedHistory } from '../../src/state/speed-history.svelte';

describe('SpeedHistory', () => {
  it('keeps the last minute of samples', () => {
    const history = new SpeedHistory();
    history.push({ t: 0, dl: 1, ul: 1 });
    history.push({ t: 30_000, dl: 2, ul: 2 });
    history.push({ t: HISTORY_MS + 1, dl: 3, ul: 3 });
    expect(history.samples.map((s) => s.dl)).toEqual([2, 3]);
    history.clear();
    expect(history.samples).toEqual([]);
  });

  it('drops samples from the future after the clock jumps back', () => {
    const history = new SpeedHistory();
    history.push({ t: 100_000, dl: 1, ul: 1 });
    history.push({ t: 50_000, dl: 2, ul: 2 }); // the clock went back 50 s
    expect(history.samples.map((s) => s.dl)).toEqual([2]);
  });
});
