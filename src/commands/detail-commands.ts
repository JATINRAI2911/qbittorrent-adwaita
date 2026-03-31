import type { DetailsApi, TorrentFile } from '../api/details';
import { PRIORITY_VALUE, renamedPath, type FileNode, type PriorityName } from '../features/details/files';
import { formatCount } from '../lib/format';
import { errorText, mutate, type ToastApi } from './mutate';

export interface DetailCommandDeps {
  api: DetailsApi;
  toast: ToastApi;
  /** Fetch the visible details tab again. */
  refresh(): void;
  /** Priorities are about to change locally, so in-flight files responses are stale. */
  filesChanged(): void;
  copyText(text: string): Promise<void>;
}

const lines = (text: string) => text.split(/\r?\n/).map((line) => line.trim());
const nonBlank = (items: string[]) => items.filter(Boolean);
const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

export function createDetailCommands(deps: DetailCommandDeps) {
  const { api, toast } = deps;

  /** Request → toast → refresh; failures explain themselves. Toasts never include URLs or addresses. */
  async function run(request: () => Promise<unknown>, success: string, failure: string): Promise<boolean> {
    try {
      await request();
    } catch (error) {
      toast.show({ title: `${failure}: ${errorText(error)}` });
      deps.refresh();
      return false;
    }
    toast.show({ title: success });
    deps.refresh();
    return true;
  }

  async function copy(text: string, what: string): Promise<boolean> {
    try {
      await deps.copyText(text);
    } catch {
      toast.show({ title: 'Couldn’t copy to the clipboard' });
      return false;
    }
    toast.show({ title: `Copied ${what}` });
    return true;
  }

  return {
    async setPriority(hash: string, files: TorrentFile[], ids: readonly number[], priority: PriorityName): Promise<boolean> {
      const value = PRIORITY_VALUE[priority];
      const wanted = new Set(ids);
      const targets = files.filter((f) => wanted.has(f.index));
      deps.filesChanged();
      const ok = await mutate(
        {
          items: targets,
          keys: ['priority'],
          optimistic: () => targets.forEach((f) => (f.priority = value)),
          request: () => api.setFilePriority(hash, ids, value),
          failure: 'Couldn’t change file priority',
        },
        toast,
        () => deps.refresh(),
      );
      if (ok) deps.refresh();
      return ok;
    },

    renamePath(hash: string, node: Pick<FileNode, 'kind' | 'path'>, newName: string): Promise<boolean> {
      const newPath = renamedPath(node.path, newName.trim());
      const rename = node.kind === 'folder' ? api.renameFolder : api.renameFile;
      return run(() => rename(hash, node.path, newPath), `Renamed “${baseName(node.path)}” to “${newName.trim()}”`, 'Couldn’t rename');
    },

    addTrackers(hash: string, text: string): Promise<boolean> {
      const urls = lines(text);
      const count = nonBlank(urls).length;
      if (!count) return Promise.resolve(false);
      return run(() => api.addTrackers(hash, urls), `Added ${count === 1 ? 'a tracker' : `${formatCount(count)} trackers`}`, 'Couldn’t add trackers');
    },

    editTracker: (hash: string, url: string, newUrl: string) => run(() => api.editTracker(hash, url, newUrl), 'Tracker updated', 'Couldn’t update the tracker'),
    removeTracker: (hash: string, url: string) => run(() => api.removeTrackers(hash, [url]), 'Removed tracker', 'Couldn’t remove the tracker'),
    copyTracker: (url: string) => copy(url, 'tracker URL'),
    copyUrl: (url: string) => copy(url, 'URL'),

    addPeers(hash: string, text: string): Promise<boolean> {
      const peers = nonBlank(text.split(/[\s,]+/));
      if (!peers.length) return Promise.resolve(false);
      return run(() => api.addPeers([hash], peers), `Added ${peers.length === 1 ? 'a peer' : `${formatCount(peers.length)} peers`}`, 'Couldn’t add peers');
    },

    banPeer: (id: string) => run(() => api.banPeers([id]), 'Peer banned', 'Couldn’t ban the peer'),
    copyPeer: (id: string) => copy(id, 'peer address'),

    addWebSeeds(hash: string, text: string): Promise<boolean> {
      const urls = nonBlank(lines(text));
      if (!urls.length) return Promise.resolve(false);
      return run(() => api.addWebSeeds(hash, urls), urls.length === 1 ? 'Added a web seed' : `Added ${formatCount(urls.length)} web seeds`, 'Couldn’t add web seeds');
    },

    editWebSeed: (hash: string, url: string, newUrl: string) => run(() => api.editWebSeed(hash, url, newUrl), 'Web seed updated', 'Couldn’t update the web seed'),
    removeWebSeed: (hash: string, url: string) => run(() => api.removeWebSeeds(hash, [url]), 'Removed web seed', 'Couldn’t remove the web seed'),

    setComment: (hash: string, comment: string) => run(() => api.setComment([hash], comment), 'Comment saved', 'Couldn’t save the comment'),
  };
}

export type DetailCommands = ReturnType<typeof createDetailCommands>;
