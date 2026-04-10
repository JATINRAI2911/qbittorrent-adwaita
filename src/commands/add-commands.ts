import type { AddApi } from '../api/add';
import type { DetailsApi } from '../api/details';
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
}

const torrentsText = (n: number) => `${formatCount(n)} ${n === 1 ? 'torrent' : 'torrents'}`;

export function createAddCommands(deps: AddCommandDeps) {
  return {
    async add(plan: readonly AddRequest[], labels: readonly string[]): Promise<boolean> {
      let added = 0;
      let failed = 0;
      try {
        for (const request of plan) {
          const result = await deps.api.add(request.sources, request.options);
          added += result.success_count + result.pending_count;
          failed += result.failure_count;
          if (request.after && result.success_count + result.pending_count > 0) {
            if (request.after.skip.length) await deps.details.setFilePriority(request.after.hash, request.after.skip, 0);
            if (request.after.start) await deps.torrents.start([request.after.hash]);
          }
        }
      } catch (error) {
        deps.toast.show({ title: `Couldn’t add torrents: ${errorText(error)}` });
        if (added) deps.refresh();
        return added > 0;
      }
      if (added === 0) deps.toast.show({ title: failed ? `Couldn’t add ${torrentsText(failed)}` : 'Nothing was added' });
      else if (failed) deps.toast.show({ title: `Added ${torrentsText(added)}, ${formatCount(failed)} couldn’t be added` });
      else deps.toast.show({ title: added === 1 && labels.length === 1 ? `Added “${labels[0]}”` : `Added ${torrentsText(added)}` });
      if (added) deps.refresh();
      return added > 0;
    },
  };
}

export type AddCommands = ReturnType<typeof createAddCommands>;
