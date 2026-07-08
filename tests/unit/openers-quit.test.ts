import { describe, expect, it, vi } from 'vitest';
import { createDialogOpeners } from '../../src/features/actions/openers';
import { DialogStore } from '../../src/ui/adw/dialogs.svelte';

describe('Quit qBittorrent', () => {
  function setup() {
    const dialogs = new DialogStore();
    const shutdown = vi.fn(async () => {});
    const openers = createDialogOpeners(dialogs, {} as never, { shutdown });
    openers.quit();
    const alert = dialogs.stack.at(-1)!;
    return { alert, shutdown };
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
});
