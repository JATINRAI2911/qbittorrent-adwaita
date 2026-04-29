import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SpeedGraph from '../../src/features/global/SpeedGraph.svelte';

describe('SpeedGraph', () => {
  it('draws the last minute with the newest sample at the right edge, and states the peaks', () => {
    const { container } = render(SpeedGraph, { samples: [{ t: 0, dl: 0, ul: 500 }, { t: 30_000, dl: 2_000_000, ul: 1000 }, { t: 60_000, dl: 1_000_000, ul: 0 }] });
    expect(screen.getByRole('img', { name: 'Speed over the last minute. Peak download 2.0 MB/s, peak upload 1.0 kB/s.' })).toBeInTheDocument();
    const dl = container.querySelector('path.dl')!.getAttribute('d')!;
    expect(dl.startsWith('M0.0 ')).toBe(true);
    expect(dl).toContain('L120.0 2.0');
    expect(dl).toMatch(/L240\.0 [\d.]+$/);
  });

  it('says there is no data yet', () => {
    render(SpeedGraph, { samples: [] });
    expect(screen.getByRole('img', { name: 'No speed data yet.' })).toBeInTheDocument();
  });
});
