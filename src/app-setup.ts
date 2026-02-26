import type { TorrentApi } from './api/torrents';
import type { AppContext } from './app-context';
import { createTorrentCommands } from './commands/torrent-commands';
import { createDialogOpeners } from './features/actions/openers';
import { ListModel } from './features/list/list-model.svelte';
import { copyText } from './lib/clipboard';
import { downloadBlob } from './lib/download';
import { Selection } from './state/selection.svelte';
import type { Session } from './state/session.svelte';
import { DialogStore } from './ui/adw/dialogs.svelte';
import { PopoverStore } from './ui/adw/popovers.svelte';
import { ToastStore } from './ui/adw/toast.svelte';

export function createApp(session: Session, api: TorrentApi): AppContext {
  const toasts = new ToastStore();
  const dialogs = new DialogStore();
  const commands = createTorrentCommands({
    api,
    toast: toasts,
    forget: (hashes) => session.forget(hashes),
    copyText: (text) => copyText(text),
    download: (blob, filename) => downloadBlob(blob, filename),
  });
  return {
    session,
    selection: new Selection(),
    list: new ListModel(session.torrents),
    commands,
    openers: createDialogOpeners(dialogs, commands),
    popovers: new PopoverStore(),
    dialogs,
    toasts,
  };
}
