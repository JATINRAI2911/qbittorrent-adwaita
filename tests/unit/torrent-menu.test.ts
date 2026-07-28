import { describe, expect, it, vi } from 'vitest';
import type { TorrentCommands } from '../../src/commands/torrent-commands';
import type { DialogOpeners } from '../../src/features/actions/openers';
import { categoryMenu, tagMenu, torrentMenu, type TorrentMenuContext } from '../../src/features/actions/torrent-menu';
import type { MenuItem, MenuModel } from '../../src/ui/adw/menu';
import { makeTorrent } from '../fixtures/torrents';

function context(overrides: Partial<TorrentMenuContext> = {}): TorrentMenuContext {
  const commands = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn(async () => true)) }) as unknown as TorrentCommands;
  const openers = new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn()) }) as unknown as DialogOpeners;
  return { commands, openers, categories: ['Films', 'ISOs'], tags: ['keep'], queueing: true, ...overrides };
}
const item = (model: MenuModel, label: string): MenuItem => model.sections.flat().find((i) => i.label === label)!;
const labels = (model: MenuModel) => model.sections.map((s) => s.map((i) => i.label));

describe('torrentMenu', () => {
  it('groups actions into GNOME-style sections', () => {
    expect(labels(torrentMenu([makeTorrent()], context()))).toEqual([
      ['Start', 'Stop', 'Force Start'],
      ['Category', 'Tags', 'Move…', 'Rename…'],
      ['Speed and Share Limits…', 'Queue', 'Options'],
      ['Force Recheck', 'Force Reannounce'],
      ['Copy', 'Export .torrent File'],
      ['Delete…'],
    ]);
  });

  it('enables only what applies to the targets', () => {
    const ctx = context({ queueing: false });
    const menu = torrentMenu([makeTorrent({ state: 'downloading' }), makeTorrent({ state: 'downloading' })], ctx);
    expect(item(menu, 'Start').disabled).toBe(true);
    expect(item(menu, 'Stop').disabled).toBe(false);
    expect(item(menu, 'Rename…').disabled).toBe(true);
    expect(item(menu, 'Queue').disabled).toBe(true);
    expect(item(menu, 'Delete 2 Torrents…')).toMatchObject({ destructive: true, accel: 'Del' });
  });

  it('shows option states as checks and disables super seeding for incomplete torrents', () => {
    const ctx = context();
    const t = makeTorrent({ seq_dl: true, progress: 0.5 });
    const options = item(torrentMenu([t], ctx), 'Options').submenu!();
    expect(item(options, 'Sequential Download').checked).toBe(true);
    expect(item(options, 'Super Seeding').disabled).toBe(true);
    item(options, 'Sequential Download').action!();
    expect(ctx.commands.setOption).toHaveBeenCalledWith([t], 'sequential', false);
  });

  it('routes actions to commands and dialogs', () => {
    const ctx = context();
    const t = makeTorrent({ infohash_v2: '' });
    const menu = torrentMenu([t], ctx);
    item(menu, 'Delete…').action!();
    expect(ctx.openers.confirmDelete).toHaveBeenCalledWith([t]);
    item(menu, 'Force Recheck').action!();
    expect(ctx.commands.recheck).toHaveBeenCalledWith([t]);
    const copy = item(menu, 'Copy').submenu!();
    expect(item(copy, 'Info Hash (v2)').disabled).toBe(true);
    item(copy, 'Magnet Link').action!();
    expect(ctx.commands.copy).toHaveBeenCalledWith([t], 'magnet');
    item(item(menu, 'Queue').submenu!(), 'Move to Top').action!();
    expect(ctx.commands.moveInQueue).toHaveBeenCalledWith([t], 'top');
  });
});

describe('torrentMenu for torrents that need attention', () => {
  it('offers Start, not Stop, for missing-files torrents', () => {
    const menu = torrentMenu([makeTorrent({ state: 'missingFiles' })], context());
    expect(item(menu, 'Start').disabled).toBe(false);
    expect(item(menu, 'Stop').disabled).toBe(true);
  });
});

describe('categoryMenu and tagMenu', () => {
  it('checks the category every target shares and offers New and Remove', () => {
    const ctx = context();
    const ts = [makeTorrent({ category: 'Films' }), makeTorrent({ category: 'Films' })];
    const menu = categoryMenu(ts, ctx);
    expect(item(menu, 'Films').checked).toBe(true);
    expect(item(menu, 'ISOs').checked).toBe(false);
    // A torrent has one category: the choices are radio items.
    expect(item(menu, 'Films').radio).toBe(true);
    item(menu, 'ISOs').action!();
    expect(ctx.commands.setCategory).toHaveBeenCalledWith(ts, 'ISOs');
    item(menu, 'Remove Category').action!();
    expect(ctx.commands.setCategory).toHaveBeenCalledWith(ts, '');
    item(menu, 'New Category…').action!();
    expect(ctx.openers.newCategory).toHaveBeenCalledWith(ts);
  });

  it('disables Remove Category when nothing has one, and toggles tags', () => {
    const ctx = context();
    const t = makeTorrent({ category: '', tags: '' });
    expect(item(categoryMenu([t], ctx), 'Remove Category').disabled).toBe(true);
    const tags = tagMenu([t], ctx);
    expect(item(tags, 'keep').checked).toBe(false);
    item(tags, 'keep').action!();
    expect(ctx.commands.toggleTag).toHaveBeenCalledWith([t], 'keep');
  });
});
