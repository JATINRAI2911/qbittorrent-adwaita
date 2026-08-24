import { SvelteMap } from 'svelte/reactivity';
import { describe, expect, it, vi } from 'vitest';
import type { Torrent } from '../../src/api/types';
import { createDialogOpeners } from '../../src/features/actions/openers';
import { DialogStore } from '../../src/ui/adw/dialogs.svelte';
import { makeTorrent } from '../fixtures/torrents';

function setup() {
  const a = makeTorrent({ name: 'a' });
  const b = makeTorrent({ name: 'b' });
  const torrents = new SvelteMap<string, Torrent>([[a.hash, a], [b.hash, b]]);
  const dialogs = new DialogStore();
  const commands = { remove: vi.fn(async () => true), setLocation: vi.fn(async () => true), rename: vi.fn(async () => true), setLimits: vi.fn(async () => true) };
  const openers = createDialogOpeners(dialogs, commands as never, {
    current: (hashes) => hashes.map((hash) => torrents.get(hash)).filter((t): t is Torrent => t !== undefined),
  });
  return { a, b, torrents, dialogs, commands, openers };
}

describe('dialogs over torrents that change while open', () => {
  it('acts only on the torrents that still exist when confirmed', () => {
    const { a, b, torrents, dialogs, commands, openers } = setup();
    openers.confirmDelete([a, b]);
    torrents.delete(a.hash);
    (dialogs.stack.at(-1)!.props.onconfirm as (deleteFiles: boolean) => void)(false);
    expect(commands.remove).toHaveBeenCalledWith([b], false);
  });

  it('acts on the latest copy of each torrent (fresh save path, state)', () => {
    const { a, torrents, dialogs, commands, openers } = setup();
    openers.move([a]);
    const moved = { ...a, save_path: '/elsewhere' };
    torrents.set(a.hash, moved);
    (dialogs.stack.at(-1)!.props.onconfirm as (location: string) => void)('/new');
    expect(commands.setLocation).toHaveBeenCalledWith([moved], '/new');
  });

  it('tells the dialog host to close it once all its torrents are gone', () => {
    const { a, b, torrents, dialogs, openers } = setup();
    openers.limits([a, b]);
    const entry = dialogs.stack.at(-1)!;
    expect(entry.closeWhen?.()).toBe(false);
    torrents.delete(a.hash);
    expect(entry.closeWhen?.()).toBe(false);
    torrents.delete(b.hash);
    expect(entry.closeWhen?.()).toBe(true);
  });
});
