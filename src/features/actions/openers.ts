import type { Torrent } from '../../api/types';
import type { TorrentCommands } from '../../commands/torrent-commands';
import type { DialogStore } from '../../ui/adw/dialogs.svelte';
import AddDialog from '../add/AddDialog.svelte';
import DeleteDialog from './DeleteDialog.svelte';
import LimitsDialog from './LimitsDialog.svelte';
import MoveDialog from './MoveDialog.svelte';
import NameDialog from './NameDialog.svelte';
import RenameDialog from './RenameDialog.svelte';

export interface DialogOpeners {
  confirmDelete(torrents: Torrent[]): void;
  add(initial?: { text?: string; files?: File[] }): void;
  move(torrents: Torrent[]): void;
  rename(torrent: Torrent): void;
  limits(torrents: Torrent[]): void;
  newCategory(torrents: Torrent[]): void;
  newTag(torrents: Torrent[]): void;
}

export function createDialogOpeners(
  dialogs: DialogStore,
  commands: TorrentCommands,
  extra: { listDirectories?: (dir: string) => Promise<string[]> } = {},
): DialogOpeners {
  return {
    add(initial = {}) {
      dialogs.open(AddDialog, { text: initial.text ?? '', files: initial.files ?? [] });
    },
    confirmDelete(torrents) {
      if (!torrents.length) return;
      dialogs.open(DeleteDialog, { torrents, onconfirm: (deleteFiles: boolean) => void commands.remove(torrents, deleteFiles) });
    },
    move(torrents) {
      if (!torrents.length) return;
      dialogs.open(MoveDialog, { torrents, list: extra.listDirectories, onconfirm: (location: string) => void commands.setLocation(torrents, location) });
    },
    rename(torrent) {
      dialogs.open(RenameDialog, { torrent, onconfirm: (name: string) => void commands.rename(torrent, name) });
    },
    limits(torrents) {
      if (!torrents.length) return;
      dialogs.open(LimitsDialog, { torrents, onconfirm: (changes) => void commands.setLimits(torrents, changes) });
    },
    newCategory(torrents) {
      dialogs.open(NameDialog, {
        title: 'New Category',
        confirmLabel: 'Create',
        pathLabel: 'Save path (optional)',
        onconfirm: async (name: string, path: string) => {
          if ((await commands.createCategory(name, path)) && torrents.length) await commands.setCategory(torrents, name);
        },
      });
    },
    newTag(torrents) {
      dialogs.open(NameDialog, {
        title: 'New Tag',
        confirmLabel: 'Create',
        forbidComma: true,
        onconfirm: async (name: string) => {
          if ((await commands.createTag(name)) && torrents.length) await commands.toggleTag(torrents, name);
        },
      });
    },
  };
}
