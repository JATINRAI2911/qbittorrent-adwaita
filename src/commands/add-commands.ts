import type { AddApi } from '../api/add';
import type { DetailsApi } from '../api/details';
import { ApiError } from '../api/client';
import type { TorrentApi } from '../api/torrents';
import type { AddRequest } from '../features/add/plan';
import { formatCount } from '../lib/format';
import { errorText, type ToastApi } from './mutate';

export interface AddCommandDeps {
  api: Pick<AddApi, 'add'>;
  torrents: Pick<TorrentApi, 'start'>;
  details: Pick<DetailsApi, 'setFilePriority'>;
  toast: ToastApi;
  /** Poke the main sync so the new torrents show up now. */
  refresh(): void;
  /** Delay between attempts to reach a just-added torrent (injectable for tests). */
  wait?(ms: number): Promise<void>;
}

/** qBittorrent registers an added torrent asynchronously: until then per-torrent calls answer 404. */
const REGISTER_TRIES = 6;
const REGISTER_DELAY_MS = 250;

const torrentsText = (n: number) => `${formatCount(n)} ${n === 1 ? 'torrent' : 'torrents'}`;

export function createAddCommands(deps: AddCommandDeps) {
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function untilRegistered(call: () => Promise<unknown>): Promise<boolean> {
    for (let attempt = 1; ; attempt++) {
      try {
        await call();
        return true;
      } catch (error) {
        const notYet = error instanceof ApiError && (error.status === 404 || error.status === 409);
        if (!notYet || attempt >= REGISTER_TRIES) return false;
        await wait(REGISTER_DELAY_MS);
      }
    }
  }

  return {
    /** `labels` holds a safe name per torrent, or null when only a link is known (never shown). */
    async add(plan: readonly AddRequest[], labels: readonly (string | null)[]): Promise<boolean> {
      let added = 0;
      let failed = 0;
      let selectionFailed = false;
      try {
        for (const request of plan) {
          const result = await deps.api.add(request.sources, request.options);
          added += result.success_count + result.pending_count;
          failed += result.failure_count;
          if (request.after && result.success_count + result.pending_count > 0) {
            const { hash, skip, start } = request.after;
            if (skip.length && !(await untilRegistered(() => deps.details.setFilePriority(hash, skip, 0)))) selectionFailed = true;
            // Starting without the selection would download the files the user unchecked.
            else if (start) await untilRegistered(() => deps.torrents.start([hash]));
          }
        }
      } catch (error) {
        deps.toast.show({ title: `Couldn’t add torrents: ${errorText(error)}` });
        if (added) deps.refresh();
        return added > 0;
      }
      const name = added === 1 && labels.length === 1 ? labels[0] : null;
      if (selectionFailed) deps.toast.show({ title: `${name ? `Added “${name}”` : `Added ${torrentsText(added)}`} stopped: couldn’t apply the file selection` });
      else if (added === 0) deps.toast.show({ title: failed ? `Couldn’t add ${torrentsText(failed)}` : 'Nothing was added' });
      else if (failed) deps.toast.show({ title: `Added ${torrentsText(added)}, ${formatCount(failed)} couldn’t be added` });
      else deps.toast.show({ title: name ? `Added “${name}”` : `Added ${torrentsText(added)}` });
      if (added) deps.refresh();
      return added > 0;
    },
  };
}

export type AddCommands = ReturnType<typeof createAddCommands>;
