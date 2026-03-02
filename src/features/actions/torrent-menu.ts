import type { Torrent } from '../../api/types';
import type { TorrentCommands } from '../../commands/torrent-commands';
import { formatCount } from '../../lib/format';
import { parseTags } from '../../lib/tags';
import { isRunning, needsStart } from '../../lib/torrent-state';
import type { MenuModel } from '../../ui/adw/menu';
import type { DialogOpeners } from './openers';

export interface TorrentMenuContext {
  commands: TorrentCommands;
  openers: DialogOpeners;
  categories: readonly string[];
  tags: readonly string[];
  /** Queue moves 409 unless qBittorrent's queueing is enabled. */
  queueing: boolean;
}

export function categoryMenu(ts: readonly Torrent[], ctx: TorrentMenuContext): MenuModel {
  const list = [...ts];
  return {
    title: 'Category',
    sections: [
      ctx.categories.map((category) => ({
        label: category,
        checked: list.length > 0 && list.every((t) => t.category === category),
        action: () => void ctx.commands.setCategory(list, category),
      })),
      [
        { label: 'New Category…', action: () => ctx.openers.newCategory(list) },
        { label: 'Remove Category', disabled: list.every((t) => !t.category), action: () => void ctx.commands.setCategory(list, '') },
      ],
    ],
  };
}

export function tagMenu(ts: readonly Torrent[], ctx: TorrentMenuContext): MenuModel {
  const list = [...ts];
  return {
    title: 'Tags',
    sections: [
      ctx.tags.map((tag) => ({
        label: tag,
        checked: list.length > 0 && list.every((t) => parseTags(t.tags).includes(tag)),
        action: () => void ctx.commands.toggleTag(list, tag),
      })),
      [{ label: 'New Tag…', action: () => ctx.openers.newTag(list) }],
    ],
  };
}

export function torrentMenu(ts: readonly Torrent[], ctx: TorrentMenuContext): MenuModel {
  const list = [...ts];
  const { commands, openers } = ctx;
  const one = list.length === 1;
  const on = (field: 'seq_dl' | 'f_l_piece_prio' | 'auto_tmm' | 'super_seeding') => list.every((t) => t[field]);
  const none = (field: 'infohash_v1' | 'infohash_v2' | 'comment') => list.every((t) => !t[field]);

  return {
    sections: [
      [
        { label: 'Start', accel: 'Space', disabled: !list.some(needsStart), action: () => void commands.start(list) },
        { label: 'Stop', accel: 'Space', disabled: !list.some(isRunning), action: () => void commands.stop(list) },
        { label: 'Force Start', disabled: list.every((t) => t.force_start), action: () => void commands.forceStart(list) },
      ],
      [
        { label: 'Category', submenu: () => categoryMenu(list, ctx) },
        { label: 'Tags', submenu: () => tagMenu(list, ctx) },
        { label: 'Move…', action: () => openers.move(list) },
        { label: 'Rename…', accel: 'F2', disabled: !one, action: () => openers.rename(list[0]!) },
      ],
      [
        { label: 'Speed and Share Limits…', action: () => openers.limits(list) },
        {
          label: 'Queue',
          disabled: !ctx.queueing,
          submenu: () => ({
            title: 'Queue',
            sections: [
              [
                { label: 'Move to Top', action: () => void commands.moveInQueue(list, 'top') },
                { label: 'Move Up', action: () => void commands.moveInQueue(list, 'up') },
                { label: 'Move Down', action: () => void commands.moveInQueue(list, 'down') },
                { label: 'Move to Bottom', action: () => void commands.moveInQueue(list, 'bottom') },
              ],
            ],
          }),
        },
        {
          label: 'Options',
          submenu: () => ({
            title: 'Options',
            sections: [
              [
                { label: 'Sequential Download', checked: on('seq_dl'), action: () => void commands.setOption(list, 'sequential', !on('seq_dl')) },
                { label: 'First and Last Pieces First', checked: on('f_l_piece_prio'), action: () => void commands.setOption(list, 'firstLast', !on('f_l_piece_prio')) },
                { label: 'Automatic Management', checked: on('auto_tmm'), action: () => void commands.setOption(list, 'autoManaged', !on('auto_tmm')) },
                {
                  label: 'Super Seeding',
                  checked: on('super_seeding'),
                  disabled: list.some((t) => t.progress < 1),
                  action: () => void commands.setOption(list, 'superSeeding', !on('super_seeding')),
                },
              ],
            ],
          }),
        },
      ],
      [
        { label: 'Force Recheck', action: () => void commands.recheck(list) },
        { label: 'Force Reannounce', action: () => void commands.reannounce(list) },
      ],
      [
        {
          label: 'Copy',
          submenu: () => ({
            title: 'Copy',
            sections: [
              [
                { label: 'Name', action: () => void commands.copy(list, 'name') },
                { label: 'Info Hash (v1)', disabled: none('infohash_v1'), action: () => void commands.copy(list, 'hashV1') },
                { label: 'Info Hash (v2)', disabled: none('infohash_v2'), action: () => void commands.copy(list, 'hashV2') },
                { label: 'Magnet Link', action: () => void commands.copy(list, 'magnet') },
                { label: 'Comment', disabled: none('comment'), action: () => void commands.copy(list, 'comment') },
              ],
            ],
          }),
        },
        { label: 'Export .torrent File', action: () => void commands.exportFiles(list) },
      ],
      [
        {
          label: one ? 'Delete…' : `Delete ${formatCount(list.length)} Torrents…`,
          accel: 'Del',
          destructive: true,
          action: () => openers.confirmDelete(list),
        },
      ],
    ],
  };
}
