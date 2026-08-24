import { ApiError, type ApiErrorKind } from '../../api/client';
import type { Category, Torrent } from '../../api/types';
import type { TorrentCommands } from '../../commands/torrent-commands';
import type { DialogStore } from '../../ui/adw/dialogs.svelte';
import AlertDialog from '../../ui/adw/AlertDialog.svelte';
import AddDialog from '../add/AddDialog.svelte';
import SpeedLimitsDialog from '../global/SpeedLimitsDialog.svelte';
import StatisticsDialog from '../global/StatisticsDialog.svelte';
import PreferencesDialog from '../preferences/PreferencesDialog.svelte';
import AboutDialog from '../tools/AboutDialog.svelte';
import CookiesDialog from '../tools/CookiesDialog.svelte';
import CreateTorrentDialog from '../tools/CreateTorrentDialog.svelte';
import LogDialog from '../tools/LogDialog.svelte';
import ShortcutsDialog from '../tools/ShortcutsDialog.svelte';
import type { PageId } from '../preferences/schema';
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
  preferences(page?: PageId): void;
  log(): void;
  createTorrent(): void;
  cookies(): void;
  shortcuts(): void;
  about(): void;
  /** Confirm, then shut qBittorrent down; the window then shows the offline state. */
  quit(): void;
  speedLimits(): void;
  statistics(): void;
}

/** Errors that mean the connection went away, which is what quitting looks like from here. */
const GONE: readonly ApiErrorKind[] = ['network', 'timeout', 'aborted'];

export function createDialogOpeners(
  dialogs: DialogStore,
  commands: TorrentCommands,
  extra: {
    listDirectories?: (dir: string) => Promise<string[]>;
    shutdown?: () => Promise<void>;
    toast?: { show(toast: { title: string }): void };
    /** The torrents with these hashes as they are now (missing ones left out); reactive. */
    current?: (hashes: string[]) => Torrent[];
  } = {},
): DialogOpeners {
  // A dialog shows its torrents as they were when it opened, but acts on them as they are when
  // confirmed, and closes by itself once none of them exist any more.
  const now = (torrents: readonly Torrent[]): Torrent[] => (extra.current ? extra.current(torrents.map((t) => t.hash)) : [...torrents]);
  const act = (torrents: readonly Torrent[], run: (live: Torrent[]) => Promise<unknown>) => {
    const live = now(torrents);
    if (live.length) void run(live);
  };
  const whileAny = (torrents: readonly Torrent[]) => ({ closeWhen: extra.current ? () => now(torrents).length === 0 : undefined });
  return {
    add(initial = {}) {
      dialogs.open(AddDialog, { text: initial.text ?? '', files: initial.files ?? [] });
    },
    confirmDelete(torrents) {
      if (!torrents.length) return;
      dialogs.open(DeleteDialog, { torrents, onconfirm: (deleteFiles: boolean) => act(torrents, (live) => commands.remove(live, deleteFiles)) }, undefined, whileAny(torrents));
    },
    move(torrents) {
      if (!torrents.length) return;
      dialogs.open(MoveDialog, { torrents, list: extra.listDirectories, onconfirm: (location: string) => act(torrents, (live) => commands.setLocation(live, location)) }, undefined, whileAny(torrents));
    },
    rename(torrent) {
      dialogs.open(RenameDialog, { torrent, onconfirm: (name: string) => act([torrent], ([live]) => commands.rename(live!, name)) }, undefined, whileAny([torrent]));
    },
    limits(torrents) {
      if (!torrents.length) return;
      dialogs.open(LimitsDialog, { torrents, onconfirm: (changes) => act(torrents, (live) => commands.setLimits(live, changes)) }, undefined, whileAny(torrents));
    },
    newCategory(torrents) {
      dialogs.open(CategoryDialog, {
        list: extra.listDirectories,
        onconfirm: async ({ name, savePath, download }) => {
          if ((await commands.createCategory(name, savePath, download)) && now(torrents).length) await commands.setCategory(now(torrents), name);
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
    preferences(page) {
      dialogs.open(PreferencesDialog, page ? { page } : {});
    },
    log() {
      dialogs.open(LogDialog, {});
    },
    createTorrent() {
      dialogs.open(CreateTorrentDialog, {});
    },
    cookies() {
      dialogs.open(CookiesDialog, {});
    },
    shortcuts() {
      dialogs.open(ShortcutsDialog, {});
    },
    about() {
      dialogs.open(AboutDialog, {});
    },
    quit() {
      const quitFailed = (error: unknown) => {
        if (!(error instanceof ApiError && GONE.includes(error.kind))) extra.toast?.show({ title: 'Couldn’t quit qBittorrent' });
      };
      dialogs.open(AlertDialog, {
        heading: 'Quit qBittorrent?',
        body: 'Downloads and seeding stop until qBittorrent is started again on the computer it runs on.',
        responses: [
          { id: 'cancel', label: 'Cancel' },
          { id: 'quit', label: 'Quit', variant: 'destructive' },
        ],
        onresponse: (id: string) => {
          if (id === 'quit') void extra.shutdown?.().catch(quitFailed);
        },
      });
    },
    speedLimits() {
      dialogs.open(SpeedLimitsDialog, {});
    },
    statistics() {
      dialogs.open(StatisticsDialog, {});
    },
    newTag(torrents) {
      dialogs.open(NameDialog, {
        title: 'New Tag',
        confirmLabel: 'Create',
        forbidComma: true,
        onconfirm: async (name: string) => {
          if ((await commands.createTag(name)) && now(torrents).length) await commands.toggleTag(now(torrents), name);
        },
      });
    },
  };
}
