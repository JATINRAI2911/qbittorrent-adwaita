import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import { createDialogOpeners } from '../../src/features/actions/openers';
import { DialogStore } from '../../src/ui/adw/dialogs.svelte';

describe('Quit qBittorrent', () => {
  function setup(shutdown = vi.fn(async () => {})) {
    const dialogs = new DialogStore();
    const toast = { show: vi.fn() };
    const openers = createDialogOpeners(dialogs, {} as never, { shutdown, toast });
    openers.quit();
    const alert = dialogs.stack.at(-1)!;
    return { alert, shutdown, toast };
  }

  it('asks first, explaining that downloads stop, and a cancel sends nothing', () => {
    const { alert, shutdown } = setup();
    expect(alert.props).toMatchObject({
      heading: 'Quit qBittorrent?',
      body: 'Downloads and seeding stop until qBittorrent is started again on the computer it runs on.',
      responses: [{ id: 'cancel', label: 'Cancel' }, { id: 'quit', label: 'Quit', variant: 'destructive' }],
    });
    (alert.props.onresponse as (id: string) => void)('cancel');
    expect(shutdown).not.toHaveBeenCalled();
  });

  it('shuts qBittorrent down once confirmed', () => {
    const { alert, shutdown } = setup();
    (alert.props.onresponse as (id: string) => void)('quit');
    expect(shutdown).toHaveBeenCalledTimes(1);
  });

  it('says so when qBittorrent refuses to quit', async () => {
    const { alert, toast } = setup(vi.fn(async () => Promise.reject(new ApiError('server', 500, 'Internal Server Error'))));
    (alert.props.onresponse as (id: string) => void)('quit');
    await vi.waitFor(() => expect(toast.show).toHaveBeenCalledWith({ title: 'Couldn’t quit qBittorrent' }));
  });

  it('stays quiet when the connection drops, since qBittorrent may already be gone', async () => {
    const { alert, toast, shutdown } = setup(vi.fn(async () => Promise.reject(new ApiError('network', 0, 'Failed to fetch'))));
    (alert.props.onresponse as (id: string) => void)('quit');
    await vi.waitFor(() => expect(shutdown).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(toast.show).not.toHaveBeenCalled();
  });
});
