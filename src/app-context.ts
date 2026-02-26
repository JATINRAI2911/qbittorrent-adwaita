import { getContext, setContext } from 'svelte';
import type { Category, ServerState, Torrent } from './api/types';
import type { TorrentCommands } from './commands/torrent-commands';
import type { DialogOpeners } from './features/actions/openers';
import type { TorrentMenuContext } from './features/actions/torrent-menu';
import type { ListModel } from './features/list/list-model.svelte';
import type { Selection } from './state/selection.svelte';
import type { DialogStore } from './ui/adw/dialogs.svelte';
import type { PopoverStore } from './ui/adw/popovers.svelte';
import type { ToastStore } from './ui/adw/toast.svelte';

/** The parts of Session that feature components read. */
export interface SessionView {
  readonly torrents: ReadonlyMap<string, Torrent>;
  readonly categories: ReadonlyMap<string, Category>;
  readonly tags: ReadonlySet<string>;
  readonly server: Partial<ServerState>;
  logout(): Promise<void>;
}

export interface AppContext {
  session: SessionView;
  selection: Selection;
  list: ListModel;
  commands: TorrentCommands;
  openers: DialogOpeners;
  popovers: PopoverStore;
  dialogs: DialogStore;
  toasts: ToastStore;
}

export const APP_CONTEXT_KEY = Symbol('app-context');

export function setAppContext(context: AppContext): AppContext {
  return setContext(APP_CONTEXT_KEY, context);
}

export function getAppContext(): AppContext {
  const context = getContext<AppContext | undefined>(APP_CONTEXT_KEY);
  if (!context) throw new Error('getAppContext() called outside <App>');
  return context;
}

/** Selected torrents that still exist. */
export function targetTorrents(app: AppContext): Torrent[] {
  return app.selection.targets().map((hash) => app.session.torrents.get(hash)).filter((t): t is Torrent => t !== undefined);
}

export function menuContext(app: AppContext): TorrentMenuContext {
  const byName = (a: string, b: string) => a.localeCompare(b);
  return {
    commands: app.commands,
    openers: app.openers,
    categories: [...app.session.categories.keys()].sort(byName),
    tags: [...app.session.tags].sort(byName),
    queueing: app.session.server.queueing ?? false,
  };
}
