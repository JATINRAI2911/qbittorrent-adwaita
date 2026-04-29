import type { Category, Torrent } from '../../api/types';
import type { TorrentCommands } from '../../commands/torrent-commands';
import type { DialogStore } from '../../ui/adw/dialogs.svelte';
import AddDialog from '../add/AddDialog.svelte';
import SpeedLimitsDialog from '../global/SpeedLimitsDialog.svelte';
import CategoriesDialog from './CategoriesDialog.svelte';
import CategoryDialog from './CategoryDialog.svelte';
import DeleteDialog from './DeleteDialog.svelte';
import LimitsDialog from './LimitsDialog.svelte';
import MoveDialog from './MoveDialog.svelte';
import NameDialog from './NameDialog.svelte';
import RenameDialog from './RenameDialog.svelte';
import TagsDialog from './TagsDialog.svelte';

export interface DialogOpeners {
  confirmDelete(torrents: Torrent[]): void;
  add(initial?: { text?: string; files?: File[] }): void;
  move(torrents: Torrent[]): void;
  rename(torrent: Torrent): void;
  limits(torrents: Torrent[]): void;
  newCategory(torrents: Torrent[]): void;
  newTag(torrents: Torrent[]): void;
  editCategory(category: Category): void;
  manageCategories(): void;
  manageTags(): void;
  speedLimits(): void;
  statistics(): void;
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
      dialogs.open(CategoryDialog, {
        list: extra.listDirectories,
        onconfirm: async ({ name, savePath, download }) => {
          if ((await commands.createCategory(name, savePath, download)) && torrents.length) await commands.setCategory(torrents, name);
        },
      });
    },
    editCategory(category) {
      dialogs.open(CategoryDialog, {
        category,
        list: extra.listDirectories,
        onconfirm: ({ name, savePath, download }) => void commands.editCategory(name, savePath, download),
      });
    },
    manageCategories() {
      dialogs.open(CategoriesDialog, {});
    },
    manageTags() {
      dialogs.open(TagsDialog, {});
    },
    speedLimits() {
      dialogs.open(SpeedLimitsDialog, {});
    },
    statistics() {},
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
