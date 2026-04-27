import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import { createGlobalCommands } from '../../src/commands/global-commands';
import type { ToastInput } from '../../src/ui/adw/toast.svelte';

function setup() {
  let alt = false;
  const transfer = { setSpeedLimitsMode: vi.fn(async (_on: boolean) => {}) };
  const app = { setPreferences: vi.fn(async (_changes: Record<string, unknown>) => {}) };
  const toasts: ToastInput[] = [];
  const refresh = vi.fn();
  const commands = createGlobalCommands({
    transfer,
    app,
    toast: { show: (t) => toasts.push(t) },
    altMode: () => alt,
    setAltMode: (on) => (alt = on),
    refresh,
  });
  return { transfer, app, toasts, refresh, commands, alt: () => alt };
}

describe('setAltSpeed', () => {
  it('switches at once, asks for the exact mode, and offers Undo', async () => {
    const { transfer, toasts, refresh, commands, alt } = setup();
    const pending = commands.setAltSpeed(true);
    expect(alt()).toBe(true);
    await expect(pending).resolves.toBe(true);
    expect(transfer.setSpeedLimitsMode).toHaveBeenCalledWith(true);
    expect(toasts.at(-1)!.title).toBe('Alternative speed limits on');
    expect(refresh).toHaveBeenCalled();
    toasts.at(-1)!.undo!();
    expect(alt()).toBe(false);
    expect(transfer.setSpeedLimitsMode).toHaveBeenLastCalledWith(false);
  });

  it('rolls back to the mode before this click when the server refuses', async () => {
    const { transfer, toasts, commands, alt } = setup();
    transfer.setSpeedLimitsMode.mockRejectedValueOnce(new ApiError('network', 0, 'x'));
    await expect(commands.setAltSpeed(true)).resolves.toBe(false);
    expect(alt()).toBe(false);
    expect(toasts.at(-1)!.title).toBe('Couldn’t switch speed limits: qBittorrent is unreachable');
  });

  it('ends in the last requested mode when clicked twice quickly', async () => {
    const { transfer, commands, alt } = setup();
    await Promise.all([commands.setAltSpeed(true), commands.setAltSpeed(false)]);
    expect(alt()).toBe(false);
    expect(transfer.setSpeedLimitsMode.mock.calls.map(([on]) => on)).toEqual([true, false]);
  });
});

describe('savePreferences', () => {
  it('sends the changes, confirms, and refreshes', async () => {
    const { app, toasts, refresh, commands } = setup();
    await expect(commands.savePreferences({ dl_limit: 1024 }, 'Saved speed limits')).resolves.toBe(true);
    expect(app.setPreferences).toHaveBeenCalledWith({ dl_limit: 1024 });
    expect(toasts.at(-1)!.title).toBe('Saved speed limits');
    expect(refresh).toHaveBeenCalled();
  });

  it('does nothing without changes, and explains failures', async () => {
    const { app, toasts, commands } = setup();
    await expect(commands.savePreferences({}, 'x')).resolves.toBe(true);
    expect(app.setPreferences).not.toHaveBeenCalled();
    app.setPreferences.mockRejectedValueOnce(new ApiError('request', 400, 'Bad value'));
    await expect(commands.savePreferences({ dl_limit: -5 }, 'x')).resolves.toBe(false);
    expect(toasts.at(-1)!.title).toBe('Couldn’t save: Bad value');
  });
});
