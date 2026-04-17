import type { CategoryDownloadPath, QueueMove, ShareLimits, TorrentApi } from '../api/torrents';
import type { Torrent } from '../api/types';
import { safeFilename } from '../lib/download';
import { formatCount } from '../lib/format';
import { joinTags, parseTags } from '../lib/tags';
import { isRunning, isStopped, needsStart } from '../lib/torrent-state';
import { errorText, mutate as runMutation, snapshot, type MutationSpec, type ToastApi } from './mutate';

export type TorrentOption = 'sequential' | 'firstLast' | 'autoManaged' | 'superSeeding';
export type CopyKind = 'name' | 'hashV1' | 'hashV2' | 'magnet' | 'comment';
/** bytes per second; 0 = unlimited */
export interface SpeedLimits {
  download: number;
  upload: number;
}
/** Only the limits the user changed; everything left out stays as each torrent has it. */
export type LimitChanges = Partial<SpeedLimits & ShareLimits>;

export interface CommandDeps {
  api: TorrentApi;
  toast: ToastApi;
  /** Drop torrents from the local store (after the server removed them). */
  forget(hashes: readonly string[]): void;
  /** Ask for a full sync after a failed request, so the store matches the server again. */
  resync(): void;
  copyText(text: string): Promise<void>;
  download(blob: Blob, filename: string): void;
}

const hashesOf = (ts: readonly Torrent[]) => ts.map((t) => t.hash);
const what = (ts: readonly Torrent[]) => (ts.length === 1 ? `“${ts[0]!.name}”` : `${formatCount(ts.length)} torrents`);

function groupBy<K>(ts: readonly Torrent[], key: (t: Torrent) => K): [K, string[]][] {
  const groups = new Map<K, string[]>();
  for (const t of ts) {
    const k = key(t);
    const list = groups.get(k);
    if (list) list.push(t.hash);
    else groups.set(k, [t.hash]);
  }
  return [...groups];
}

const OPTION_FIELD = { sequential: 'seq_dl', firstLast: 'f_l_piece_prio', autoManaged: 'auto_tmm', superSeeding: 'super_seeding' } as const;
const OPTION_LABEL: Record<TorrentOption, string> = {
  sequential: 'Sequential download',
  firstLast: 'First and last pieces first',
  autoManaged: 'Automatic management',
  superSeeding: 'Super seeding',
};
const QUEUE_TEXT: Record<QueueMove, string> = {
  top: 'to the top of the queue',
  up: 'up in the queue',
  down: 'down in the queue',
  bottom: 'to the bottom of the queue',
};
const COPY_LABEL: Record<CopyKind, [string, string]> = {
  name: ['name', 'names'],
  hashV1: ['info hash', 'info hashes'],
  hashV2: ['info hash (v2)', 'info hashes (v2)'],
  magnet: ['magnet link', 'magnet links'],
  comment: ['comment', 'comments'],
};
const COPY_VALUE: Record<CopyKind, (t: Torrent) => string> = {
  name: (t) => t.name,
  hashV1: (t) => t.infohash_v1,
  hashV2: (t) => t.infohash_v2,
  magnet: (t) => t.magnet_uri,
  comment: (t) => t.comment,
};
const RUN_KEYS = ['state', 'dlspeed', 'upspeed'] as const;
const SHARE_KEYS = ['ratioLimit', 'seedingTimeLimit', 'inactiveSeedingTimeLimit', 'shareLimitAction'] as const;
const LIMIT_FIELD = {
  download: 'dl_limit',
  upload: 'up_limit',
  ratioLimit: 'ratio_limit',
  seedingTimeLimit: 'seeding_time_limit',
  inactiveSeedingTimeLimit: 'inactive_seeding_time_limit',
  shareLimitAction: 'share_limit_action',
} as const satisfies Record<keyof LimitChanges, keyof Torrent>;

export function createTorrentCommands(deps: CommandDeps) {
  const { api, toast } = deps;
  const mutate = <T extends object>(spec: MutationSpec<T>, toastApi: ToastApi) => runMutation(spec, toastApi, () => deps.resync());

  const markStopped = (ts: readonly Torrent[]) => () => {
    for (const t of ts) {
      t.state = t.progress >= 1 ? 'stoppedUP' : 'stoppedDL';
      t.dlspeed = 0;
      t.upspeed = 0;
    }
  };
  // Error / missing-files torrents keep their state: the server keeps reporting it until a recheck says otherwise.
  const markStarted = (ts: readonly Torrent[]) => () => {
    for (const t of ts) if (isStopped(t)) t.state = t.progress >= 1 ? 'uploading' : 'downloading';
  };

  /** Undo = a silent mutation back to the pre-command values. */
  const undoTo = (items: readonly Torrent[], keys: readonly (keyof Torrent)[], restore: () => void, request: () => Promise<unknown>) => () =>
    void mutate({ items, keys, optimistic: restore, request, failure: 'Couldn’t undo' }, toast);

  const commands = {
    start(ts: readonly Torrent[]): Promise<boolean> {
      const targets = ts.filter(needsStart);
      if (!targets.length) return Promise.resolve(false);
      const hashes = hashesOf(targets);
      return mutate(
        {
          items: targets,
          keys: RUN_KEYS,
          optimistic: markStarted(targets),
          request: () => api.start(hashes),
          success: `Started ${what(targets)}`,
          failure: 'Couldn’t start',
          undo: undoTo(targets, RUN_KEYS, markStopped(targets), () => api.stop(hashes)),
        },
        toast,
      );
    },

    stop(ts: readonly Torrent[]): Promise<boolean> {
      const targets = ts.filter(isRunning);
      if (!targets.length) return Promise.resolve(false);
      const hashes = hashesOf(targets);
      const before = snapshot(targets, RUN_KEYS);
      return mutate(
        {
          items: targets,
          keys: RUN_KEYS,
          optimistic: markStopped(targets),
          request: () => api.stop(hashes),
          success: `Stopped ${what(targets)}`,
          failure: 'Couldn’t stop',
          undo: undoTo(targets, RUN_KEYS, before, () => api.start(hashes)),
        },
        toast,
      );
    },

    toggle(ts: readonly Torrent[]): Promise<boolean> {
      return ts.some(isRunning) ? commands.stop(ts) : commands.start(ts);
    },

    forceStart(ts: readonly Torrent[]): Promise<boolean> {
      const targets = ts.filter((t) => !t.force_start);
      if (!targets.length) return Promise.resolve(false);
      const hashes = hashesOf(targets);
      const wasIdle = hashesOf(targets.filter(needsStart));
      const wasRunning = hashesOf(targets.filter(isRunning));
      const keys = ['force_start', 'state'] as const;
      const before = snapshot(targets, keys);
      return mutate(
        {
          items: targets,
          keys,
          optimistic: () => {
            for (const t of targets) {
              t.force_start = true;
              t.state = t.progress >= 1 ? 'forcedUP' : 'forcedDL';
            }
          },
          request: () => api.setForceStart(hashes, true),
          success: `Force started ${what(targets)}`,
          failure: 'Couldn’t force start',
          // setForceStart(false) restarts in auto-managed mode, so torrents that weren't running get stopped instead.
          undo: undoTo(targets, keys, before, () =>
            Promise.all([
              ...(wasIdle.length ? [api.stop(wasIdle)] : []),
              ...(wasRunning.length ? [api.setForceStart(wasRunning, false)] : []),
            ]),
          ),
        },
        toast,
      );
    },

    setCategory(ts: readonly Torrent[], category: string): Promise<boolean> {
      const targets = ts.filter((t) => t.category !== category);
      if (!targets.length) return Promise.resolve(false);
      const previous = groupBy(targets, (t) => t.category);
      const before = snapshot(targets, ['category']);
      return mutate(
        {
          items: targets,
          keys: ['category'],
          optimistic: () => targets.forEach((t) => (t.category = category)),
          request: () => api.setCategory(hashesOf(targets), category),
          success: category ? `Moved ${what(targets)} to “${category}”` : `Removed the category from ${what(targets)}`,
          failure: 'Couldn’t change the category',
          undo: undoTo(targets, ['category'], before, () => Promise.all(previous.map(([c, hs]) => api.setCategory(hs, c)))),
        },
        toast,
      );
    },

    toggleTag(ts: readonly Torrent[], tag: string): Promise<boolean> {
      const has = (t: Torrent) => parseTags(t.tags).includes(tag);
      const adding = !ts.every(has);
      const targets = adding ? ts.filter((t) => !has(t)) : [...ts];
      if (!targets.length) return Promise.resolve(false);
      const hashes = hashesOf(targets);
      const before = snapshot(targets, ['tags']);
      return mutate(
        {
          items: targets,
          keys: ['tags'],
          optimistic: () => {
            for (const t of targets) t.tags = joinTags(adding ? [...parseTags(t.tags), tag] : parseTags(t.tags).filter((x) => x !== tag));
          },
          request: () => (adding ? api.addTags(hashes, [tag]) : api.removeTags(hashes, [tag])),
          success: adding ? `Tagged ${what(targets)} “${tag}”` : `Removed tag “${tag}” from ${what(targets)}`,
          failure: 'Couldn’t change tags',
          undo: undoTo(targets, ['tags'], before, () => (adding ? api.removeTags(hashes, [tag]) : api.addTags(hashes, [tag]))),
        },
        toast,
      );
    },

    setOption(ts: readonly Torrent[], option: TorrentOption, value: boolean): Promise<boolean> {
      const field = OPTION_FIELD[option];
      const targets = ts.filter((t) => t[field] !== value);
      if (!targets.length) return Promise.resolve(false);
      const hashes = hashesOf(targets);
      const send = (v: boolean) => {
        switch (option) {
          case 'sequential':
            return api.toggleSequentialDownload(hashes);
          case 'firstLast':
            return api.toggleFirstLastPiecePrio(hashes);
          case 'autoManaged':
            return api.setAutoManagement(hashes, v);
          case 'superSeeding':
            return api.setSuperSeeding(hashes, v);
        }
      };
      // Turning automatic management on relocates the files to the category folder; undo moves them back
      // (setLocation also turns it off again on the server).
      const relocates = option === 'autoManaged' && value;
      const keys: (keyof Torrent)[] = relocates ? [field, 'save_path'] : [field];
      const oldFolders = groupBy(targets, (t) => t.save_path);
      const before = snapshot(targets, keys);
      return mutate(
        {
          items: targets,
          keys,
          optimistic: () => targets.forEach((t) => (t[field] = value)),
          request: () => send(value),
          success: `${OPTION_LABEL[option]} ${value ? 'on' : 'off'} for ${what(targets)}`,
          failure: `Couldn’t change ${OPTION_LABEL[option].toLowerCase()}`,
          undo: undoTo(targets, keys, before, () =>
            relocates ? Promise.all(oldFolders.map(([path, hs]) => api.setLocation(hs, path))) : send(!value),
          ),
        },
        toast,
      );
    },

    moveInQueue(ts: readonly Torrent[], where: QueueMove): Promise<boolean> {
      return mutate(
        { items: ts, keys: [], request: () => api.moveInQueue(hashesOf(ts), where), success: `Moved ${what(ts)} ${QUEUE_TEXT[where]}`, failure: 'Couldn’t change the queue' },
        toast,
      );
    },

    recheck(ts: readonly Torrent[]): Promise<boolean> {
      return mutate({ items: ts, keys: [], request: () => api.recheck(hashesOf(ts)), success: `Checking ${what(ts)}`, failure: 'Couldn’t recheck' }, toast);
    },

    reannounce(ts: readonly Torrent[]): Promise<boolean> {
      return mutate({ items: ts, keys: [], request: () => api.reannounce(hashesOf(ts)), success: `Reannounced ${what(ts)}`, failure: 'Couldn’t reannounce' }, toast);
    },

    setLocation(ts: readonly Torrent[], location: string): Promise<boolean> {
      const path = location.trim();
      const targets = ts.filter((t) => t.save_path !== path);
      if (!path || !targets.length) return Promise.resolve(false);
      const previous = groupBy(targets, (t) => t.save_path);
      const wasAuto = hashesOf(targets.filter((t) => t.auto_tmm));
      const keys = ['save_path', 'auto_tmm'] as const;
      const before = snapshot(targets, keys);
      return mutate(
        {
          items: targets,
          keys,
          optimistic: () => {
            for (const t of targets) {
              t.save_path = path;
              t.auto_tmm = false; // qBittorrent turns automatic management off when you move a torrent
            }
          },
          request: () => api.setLocation(hashesOf(targets), path),
          success: `Moving ${what(targets)} to ${path}`,
          failure: 'Couldn’t move',
          // setLocation turns automatic management off on the server, so re-enable it only once the moves are done.
          undo: undoTo(targets, keys, before, async () => {
            await Promise.all(previous.map(([p, hs]) => api.setLocation(hs, p)));
            if (wasAuto.length) await api.setAutoManagement(wasAuto, true);
          }),
        },
        toast,
      );
    },

    rename(t: Torrent, name: string): Promise<boolean> {
      const next = name.trim();
      if (!next || next === t.name) return Promise.resolve(false);
      const previous = t.name;
      const before = snapshot([t], ['name']);
      return mutate(
        {
          items: [t],
          keys: ['name'],
          optimistic: () => (t.name = next),
          request: () => api.rename(t.hash, next),
          success: 'Renamed torrent',
          failure: 'Couldn’t rename',
          undo: undoTo([t], ['name'], before, () => api.rename(t.hash, previous)),
        },
        toast,
      );
    },

    setLimits(ts: readonly Torrent[], changes: LimitChanges): Promise<boolean> {
      const keys = (Object.keys(changes) as (keyof LimitChanges)[]).filter((key) => changes[key] !== undefined).map((key) => LIMIT_FIELD[key]);
      if (!ts.length || !keys.length) return Promise.resolve(false);
      const hashes = hashesOf(ts);
      const shareChanged = SHARE_KEYS.some((key) => changes[key] !== undefined);
      const shareOf = (t: Torrent): ShareLimits => ({
        ratioLimit: t.ratio_limit,
        seedingTimeLimit: t.seeding_time_limit,
        inactiveSeedingTimeLimit: t.inactive_seeding_time_limit,
        shareLimitAction: t.share_limit_action,
      });
      // setShareLimits needs all four values, so torrents are grouped by what they end up with.
      const shareRequests = (pick: (t: Torrent) => ShareLimits) =>
        groupBy(ts, (t) => JSON.stringify(pick(t))).map(([json, hs]) => api.setShareLimits(hs, JSON.parse(json) as ShareLimits));
      const newShare = (t: Torrent): ShareLimits => {
        const { download: _download, upload: _upload, ...share } = changes;
        return { ...shareOf(t), ...share };
      };
      const oldShare = new Map(ts.map((t) => [t.hash, shareOf(t)]));
      const downloads = groupBy(ts, (t) => t.dl_limit);
      const uploads = groupBy(ts, (t) => t.up_limit);
      const before = snapshot(ts, keys);
      return mutate(
        {
          items: ts,
          keys,
          optimistic: () => {
            for (const t of ts) {
              const share = newShare(t);
              if (changes.download !== undefined) t.dl_limit = changes.download;
              if (changes.upload !== undefined) t.up_limit = changes.upload;
              t.ratio_limit = share.ratioLimit;
              t.seeding_time_limit = share.seedingTimeLimit;
              t.inactive_seeding_time_limit = share.inactiveSeedingTimeLimit;
              t.share_limit_action = share.shareLimitAction;
            }
          },
          request: () => {
            const pending = ts.map(newShare);
            const byHash = new Map(ts.map((t, i) => [t.hash, pending[i]!]));
            return Promise.all([
              ...(changes.download !== undefined ? [api.setDownloadLimit(hashes, changes.download)] : []),
              ...(changes.upload !== undefined ? [api.setUploadLimit(hashes, changes.upload)] : []),
              ...(shareChanged ? shareRequests((t) => byHash.get(t.hash)!) : []),
            ]);
          },
          success: `Updated limits for ${what(ts)}`,
          failure: 'Couldn’t update limits',
          undo: undoTo(ts, keys, before, () =>
            Promise.all([
              ...(changes.download !== undefined ? downloads.map(([limit, hs]) => api.setDownloadLimit(hs, limit)) : []),
              ...(changes.upload !== undefined ? uploads.map(([limit, hs]) => api.setUploadLimit(hs, limit)) : []),
              ...(shareChanged ? shareRequests((t) => oldShare.get(t.hash)!) : []),
            ]),
          ),
        },
        toast,
      );
    },

    async remove(ts: readonly Torrent[], deleteFiles: boolean): Promise<boolean> {
      if (!ts.length) return false;
      const hashes = hashesOf(ts);
      try {
        await api.remove(hashes, deleteFiles);
      } catch (error) {
        toast.show({ title: `Couldn’t delete: ${errorText(error)}` });
        deps.resync();
        return false;
      }
      deps.forget(hashes);
      toast.show({ title: `${deleteFiles ? 'Deleted' : 'Removed'} ${what(ts)}` });
      return true;
    },

    async copy(ts: readonly Torrent[], kind: CopyKind): Promise<boolean> {
      const values = ts.map(COPY_VALUE[kind]).filter(Boolean);
      if (!values.length) {
        toast.show({ title: 'Nothing to copy' });
        return false;
      }
      try {
        await deps.copyText(values.join('\n'));
      } catch {
        toast.show({ title: 'Couldn’t copy to the clipboard' });
        return false;
      }
      const [one, many] = COPY_LABEL[kind];
      toast.show({ title: `Copied ${values.length === 1 ? one : many}` });
      return true;
    },

    async exportFiles(ts: readonly Torrent[]): Promise<boolean> {
      for (const t of ts) {
        try {
          deps.download(await api.exportTorrent(t.hash), `${safeFilename(t.name)}.torrent`);
        } catch (error) {
          toast.show({ title: `Couldn’t export “${t.name}”: ${errorText(error)}` });
          return false;
        }
      }
      return true;
    },

    async createCategory(name: string, savePath: string, download?: CategoryDownloadPath): Promise<boolean> {
      try {
        await api.createCategory(name, savePath.trim(), download);
      } catch (error) {
        toast.show({ title: `Couldn’t create the category: ${errorText(error)}` });
        return false;
      }
      toast.show({ title: `Created category “${name}”` });
      return true;
    },

    async editCategory(name: string, savePath: string, download: CategoryDownloadPath): Promise<boolean> {
      try {
        await api.editCategory(name, savePath.trim(), download);
      } catch (error) {
        toast.show({ title: `Couldn’t save the category: ${errorText(error)}` });
        return false;
      }
      toast.show({ title: `Saved category “${name}”` });
      return true;
    },

    async removeCategories(names: readonly string[]): Promise<boolean> {
      try {
        await api.removeCategories(names);
      } catch (error) {
        toast.show({ title: `Couldn’t remove categories: ${errorText(error)}` });
        return false;
      }
      toast.show({ title: names.length === 1 ? `Removed category “${names[0]}”` : `Removed ${formatCount(names.length)} categories` });
      return true;
    },

    async deleteTags(tags: readonly string[]): Promise<boolean> {
      try {
        await api.deleteTags(tags);
      } catch (error) {
        toast.show({ title: `Couldn’t delete tags: ${errorText(error)}` });
        return false;
      }
      toast.show({ title: tags.length === 1 ? `Deleted tag “${tags[0]}”` : `Deleted ${formatCount(tags.length)} tags` });
      return true;
    },

    async createTag(name: string): Promise<boolean> {
      try {
        await api.createTags([name]);
      } catch (error) {
        toast.show({ title: `Couldn’t create the tag: ${errorText(error)}` });
        return false;
      }
      toast.show({ title: `Created tag “${name}”` });
      return true;
    },
  };
  return commands;
}

export type TorrentCommands = ReturnType<typeof createTorrentCommands>;
