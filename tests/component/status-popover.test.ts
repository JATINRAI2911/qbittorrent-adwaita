import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import StatusPopover from '../../src/features/global/StatusPopover.svelte';
import { HEALTHY } from '../../src/state/health';
import { makeAppContext, withApp } from '../fixtures/app-context';

function setup() {
  const app = makeAppContext();
  Object.assign(app.session.server, {
    dl_info_speed: 2_000_000, up_info_speed: 0, dl_rate_limit: 40_960_000, up_rate_limit: 0,
    use_alt_speed_limits: false, free_space_on_disk: 27_958_935_552, dht_nodes: 339, dl_info_data: 1_000, up_info_data: 2_454_219_433,
  });
  app.session.speeds.push({ t: 0, dl: 1, ul: 1 });
  const close = vi.fn();
  render(StatusPopover, { props: { health: () => HEALTHY, close }, context: withApp(app) });
  return { app, close };
}

describe('StatusPopover', () => {
  it('shows health, speeds with their limits, a graph and the session figures', () => {
    setup();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('↓ 2.0 MB/s')).toBeInTheDocument();
    expect(screen.getByText('Limit 41.0 MB/s')).toBeInTheDocument();
    expect(screen.getByText('No limit')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Speed over the last minute/ })).toBeInTheDocument();
    expect(screen.getByText('339')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Alternative speed limits/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('holds its numbers still while the pointer is over it', async () => {
    const { app } = setup();
    const popover = screen.getByText('Connected').closest('.status-popover')!;
    await fireEvent.pointerEnter(popover);
    app.session.server.dl_info_speed = 5_000_000;
    flushSync();
    expect(screen.getByText('↓ 2.0 MB/s')).toBeInTheDocument();
    await fireEvent.pointerLeave(popover);
    expect(screen.getByText('↓ 5.0 MB/s')).toBeInTheDocument();
  });

  it('switches alternative limits live even while frozen, and opens the dialogs', async () => {
    const { app, close } = setup();
    await fireEvent.pointerEnter(screen.getByText('Connected').closest('.status-popover')!);
    await userEvent.click(screen.getByRole('switch', { name: /Alternative speed limits/ }));
    expect(app.global.commands.setAltSpeed).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Speed Limits…' }));
    expect(close).toHaveBeenCalled();
    expect(app.openers.speedLimits).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Statistics…' }));
    expect(app.openers.statistics).toHaveBeenCalled();
  });
});
