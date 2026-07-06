import { getContext, setContext } from 'svelte';
import type { AddApi } from './api/add';
import type { AppApi } from './api/app';
import type { CreatorApi } from './api/creator';
import type { LogApi } from './api/log';
import type { Category, ServerState, Torrent } from './api/types';
import type { AddCommands } from './commands/add-commands';
import type { GlobalCommands } from './commands/global-commands';
import type { DetailCommands } from './commands/detail-commands';
import type { TorrentCommands } from './commands/torrent-commands';
import type { DialogOpeners } from './features/actions/openers';
import type { DetailsModel } from './features/details/details.svelte';
import type { TorrentMenuContext } from './features/actions/torrent-menu';
import type { ListModel } from './features/list/list-model.svelte';
import type { TableModel } from './features/table/table-model.svelte';
import type { UiPrefs } from './state/prefs.svelte';
import type { Selection } from './state/selection.svelte';
import type { Connection } from './state/session.svelte';
import type { ServerPrefs } from './state/server-prefs.svelte';
import type { SpeedHistory } from './state/speed-history.svelte';
import type { TrackerIndex } from './state/tracker-index.svelte';
import type { DialogStore } from './ui/adw/dialogs.svelte';
import type { PopoverStore } from './ui/adw/popovers.svelte';
import type { ToastStore } from './ui/adw/toast.svelte';

/** The parts of Session that feature components read. */
export interface SessionView {
  readonly torrents: ReadonlyMap<string, Torrent>;
  readonly categories: ReadonlyMap<string, Category>;
  readonly tags: ReadonlySet<string>;
  readonly trackers: ReadonlyMap<string, readonly string[]>;
  readonly server: Partial<ServerState>;
  readonly speeds: SpeedHistory;
  readonly connection: Connection;
  logout(): Promise<void>;
}

export interface AppContext {
  session: SessionView;
  selection: Selection;
  list: ListModel;
  table: TableModel;
  prefs: UiPrefs;
  trackers: TrackerIndex;
  details: DetailsModel;
  detailCommands: DetailCommands;
  commands: TorrentCommands;
  openers: DialogOpeners;
  popovers: PopoverStore;
  dialogs: DialogStore;
  toasts: ToastStore;
  adding: { api: AddApi; appApi: AppApi; commands: AddCommands };
  global: { prefs: ServerPrefs; commands: GlobalCommands };
  tools: { log: LogApi; creator: CreatorApi };
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

/** Rendered rows, top to bottom, in the current view - what arrows and Shift-click ranges walk. */
export function viewOrder(app: AppContext): string[] {
  return app.prefs.view === 'table' ? app.table.order : app.list.order;
}

/** Everything the current view shows, including collapsed groups - what Select All selects. */
export function viewHashes(app: AppContext): string[] {
  return app.prefs.view === 'table' ? app.table.order : app.list.allHashes;
}
