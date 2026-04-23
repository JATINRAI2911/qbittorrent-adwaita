import { addApi, type AddApi } from './api/add';
import { appApi, type AppApi } from './api/app';
import { clientdataApi, type ClientDataApi } from './api/clientdata';
import { detailsApi, type DetailsApi } from './api/details';
import type { TorrentApi } from './api/torrents';
import type { AppContext } from './app-context';
import { createAddCommands } from './commands/add-commands';
import { createDetailCommands } from './commands/detail-commands';
import { createTorrentCommands } from './commands/torrent-commands';
import { createDialogOpeners } from './features/actions/openers';
import { DetailsModel } from './features/details/details.svelte';
import { ListModel } from './features/list/list-model.svelte';
import { TableModel } from './features/table/table-model.svelte';
import { copyText } from './lib/clipboard';
import { downloadBlob } from './lib/download';
import { UiPrefs } from './state/prefs.svelte';
import { Selection } from './state/selection.svelte';
import { ServerPrefs } from './state/server-prefs.svelte';
import type { Session } from './state/session.svelte';
import { TrackerIndex } from './state/tracker-index.svelte';
import { DialogStore } from './ui/adw/dialogs.svelte';
import { PopoverStore } from './ui/adw/popovers.svelte';
import { ToastStore } from './ui/adw/toast.svelte';

function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function createApp(
  session: Session,
  api: TorrentApi,
  clientdata: ClientDataApi = clientdataApi,
  storage = browserStorage(),
  details: DetailsApi = detailsApi,
  appClient: AppApi = appApi,
  add: AddApi = addApi,
): AppContext {
  const toasts = new ToastStore();
  const dialogs = new DialogStore();
  const prefs = new UiPrefs({ api: clientdata, storage });
  const trackers = new TrackerIndex(session.trackers);
  const list = new ListModel(session.torrents, { hosts: () => trackers.byHash, sort: () => prefs.listSort });
  const commands = createTorrentCommands({
    api,
    toast: toasts,
    forget: (hashes) => session.forget(hashes),
    resync: () => session.resync(),
    copyText: (text) => copyText(text),
    download: (blob, filename) => downloadBlob(blob, filename),
  });
  const detailModel = new DetailsModel({
    api: details,
    isHidden: () => document.hidden,
    onVisible: (callback) => {
      const handler = () => {
        if (!document.hidden) callback();
      };
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    },
  });
  const detailCommands = createDetailCommands({
    api: details,
    toast: toasts,
    refresh: () => detailModel.refresh(),
    filesChanged: () => detailModel.markFilesChanged(),
    copyText: (text) => copyText(text),
  });
  const serverPrefs = new ServerPrefs(() => appClient.preferences());
  return {
    session,
    selection: new Selection(),
    list,
    table: new TableModel(list, () => prefs.tableSort),
    prefs,
    trackers,
    details: detailModel,
    detailCommands,
    commands,
    openers: createDialogOpeners(dialogs, commands, { listDirectories: (dir) => appClient.directoryContent(dir) }),
    popovers: new PopoverStore(),
    dialogs,
    toasts,
    adding: {
      api: add,
      appApi: appClient,
      commands: createAddCommands({ api: add, torrents: api, details, toast: toasts, refresh: () => session.retryNow() }),
    },
    global: { prefs: serverPrefs },
  };
}
