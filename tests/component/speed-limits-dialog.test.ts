import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SpeedLimitsDialog from '../../src/features/global/SpeedLimitsDialog.svelte';
import { ServerPrefs } from '../../src/state/server-prefs.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';

function setup(fail = false) {
  const load = vi.fn(async () => ({ dl_limit: 1_048_576, up_limit: 0, alt_dl_limit: 10_240, alt_up_limit: 10_240, scheduler_enabled: false, schedule_from_hour: 8, schedule_from_min: 0, schedule_to_hour: 20, schedule_to_min: 0, scheduler_days: 0 }));
  if (fail) load.mockRejectedValueOnce(new Error('offline'));
  const app = makeAppContext([], {});
  app.global.prefs = new ServerPrefs(load);
  const close = vi.fn();
  render(SpeedLimitsDialog, { props: { close }, context: withApp(app) });
  return { app, close, load };
}

describe('SpeedLimitsDialog', () => {
  it('loads the current limits fresh and saves only what changed', async () => {
    const { app, close, load } = setup();
    const download = await screen.findByRole('textbox', { name: 'Download' });
    expect(load).toHaveBeenCalled();
    expect(download).toHaveValue('1024');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.clear(download);
    await userEvent.type(download, '2048{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(app.global.commands.savePreferences).toHaveBeenCalledWith({ dl_limit: 2_097_152 }, 'Saved speed limits');
    expect(close).toHaveBeenCalled();
  });

  it('reveals the schedule when it is switched on', async () => {
    const { app } = setup();
    await userEvent.click(await screen.findByRole('switch', { name: /Use alternative limits on a schedule/ }));
    const from = screen.getByLabelText('From');
    await fireEvent.input(from, { target: { value: '23:15' } });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Days' }), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(app.global.commands.savePreferences).toHaveBeenCalledWith(
      { scheduler_enabled: true, schedule_from_hour: 23, schedule_from_min: 15, scheduler_days: 2 },
      'Saved speed limits',
    );
  });

  it('says so when it can’t read the current limits, instead of showing stale or zero values', async () => {
    setup(true);
    expect(await screen.findByText('Couldn’t read the current speed limits.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Download' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(await screen.findByRole('textbox', { name: 'Download' })).toHaveValue('1024');
  });
});
