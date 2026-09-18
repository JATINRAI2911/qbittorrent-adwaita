import type { AddOptions, AddSources } from '../../api/add';
import type { AddForm, AddItem } from './add-model.svelte';

export interface AddRequest {
  sources: AddSources;
  options: AddOptions;
  /** For an uploaded file with a file selection: skip these files, then start if wanted. */
  after?: { hash: string; skip: number[]; start: boolean };
}

/** `unknown`: options whose server default never loaded and the user didn't set; left to qBittorrent. */
function commonOptions(form: AddForm, unknown: ReadonlySet<keyof AddForm>): AddOptions {
  const options: AddOptions = {};
  if (!unknown.has('autoTMM')) options.autoTMM = form.autoTMM;
  if (!unknown.has('start')) options.stopped = !form.start;
  if (!unknown.has('contentLayout')) options.contentLayout = form.contentLayout;
  if (!unknown.has('stopCondition')) options.stopCondition = form.stopCondition;
  // A save path counts once management is known to be manual, or the user typed one (which only
  // means anything under manual management, so that is then sent too).
  if (!form.autoTMM && (!unknown.has('autoTMM') || !unknown.has('savePath'))) {
    if (unknown.has('autoTMM')) options.autoTMM = false;
    options.savepath = form.savePath.trim();
    if (form.useDownloadPath) {
      options.useDownloadPath = true;
      options.downloadPath = form.downloadPath.trim();
    }
  }
  if (form.category) options.category = form.category;
  if (form.tags.length) options.tags = [...form.tags];
  if (form.skipChecking) options.skip_checking = true;
  if (form.sequential) options.sequentialDownload = true;
  if (form.firstLast) options.firstLastPiecePrio = true;
  if (form.addToTop) options.addToTopOfQueue = true;
  if (form.dlLimitKiB > 0) options.dlLimit = Math.round(form.dlLimitKiB * 1024);
  if (form.upLimitKiB > 0) options.upLimit = Math.round(form.upLimitKiB * 1024);
  return options;
}

/**
 * The `torrents/add` requests for what's in the dialog. qBittorrent refuses `filePriorities` with
 * more than one source and for uploaded files, so a selection is only sent for a single link, and a
 * single uploaded file is added stopped and then has its skipped files set afterwards.
 */
export function buildAddPlan(items: readonly AddItem[], form: AddForm, skipped: ReadonlySet<number>, unknown: ReadonlySet<keyof AddForm> = new Set()): AddRequest[] {
  // Each torrent once: two items can resolve to the same hash (a magnet and its .torrent file).
  const hashes = new Set<string>();
  const addable = items.filter((item) => {
    if (item.status === 'duplicate') return false;
    if (!item.hash) return true;
    if (hashes.has(item.hash)) return false;
    hashes.add(item.hash);
    return true;
  });
  if (!addable.length) return [];
  const options = commonOptions(form, unknown);
  const single = addable.length === 1 ? addable[0]! : null;
  if (single && form.rename.trim()) options.rename = form.rename.trim();

  const fileCount = single?.metadata?.info.files.length ?? 0;
  const selection = single && fileCount > 1 && skipped.size > 0 ? [...skipped].filter((i) => i < fileCount).sort((a, b) => a - b) : [];

  if (single && selection.length) {
    if (single.kind === 'file') {
      return [{ sources: { files: [single.source as File] }, options: { ...options, stopped: true }, after: { hash: single.hash ?? single.metadata!.hash, skip: selection, start: form.start } }];
    }
    const priorities = Array.from({ length: fileCount }, (_, i) => (selection.includes(i) ? 0 : 1));
    return [{ sources: { urls: [single.source as string] }, options: { ...options, filePriorities: priorities } }];
  }

  const urls = addable.filter((item) => item.kind !== 'file').map((item) => item.source as string);
  const files = addable.filter((item) => item.kind === 'file').map((item) => item.source as File);
  const plan: AddRequest[] = [];
  if (urls.length) plan.push({ sources: { urls }, options });
  if (files.length) plan.push({ sources: { files }, options });
  return plan;
}
