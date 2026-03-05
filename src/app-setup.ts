import { clientdataApi, type ClientDataApi } from './api/clientdata';
import type { TorrentApi } from './api/torrents';
import type { AppContext } from './app-context';
import { createTorrentCommands } from './commands/torrent-commands';
import { createDialogOpeners } from './features/actions/openers';
import { ListModel } from './features/list/list-model.svelte';
import { TableModel } from './features/table/table-model.svelte';
import { copyText } from './lib/clipboard';
import { downloadBlob } from './lib/download';
import { UiPrefs } from './state/prefs.svelte';
import { Selection } from './state/selection.svelte';
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

export function createApp(session: Session, api: TorrentApi, clientdata: ClientDataApi = clientdataApi, storage = browserStorage()): AppContext {
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
  return {
    session,
    selection: new Selection(),
    list,
    table: new TableModel(list, () => prefs.tableSort),
    prefs,
    trackers,
    commands,
    openers: createDialogOpeners(dialogs, commands),
    popovers: new PopoverStore(),
    dialogs,
    toasts,
  };
}
