import type { AddOptions, AddSources } from '../../api/add';
import type { AddForm, AddItem } from './add-model.svelte';

export interface AddRequest {
  sources: AddSources;
  options: AddOptions;
  /** For an uploaded file with a file selection: skip these files, then start if wanted. */
  after?: { hash: string; skip: number[]; start: boolean };
}

function commonOptions(form: AddForm): AddOptions {
  const options: AddOptions = {
    autoTMM: form.autoTMM,
    stopped: !form.start,
    contentLayout: form.contentLayout,
    stopCondition: form.stopCondition,
  };
  if (!form.autoTMM) {
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
export function buildAddPlan(items: readonly AddItem[], form: AddForm, skipped: ReadonlySet<number>): AddRequest[] {
  const addable = items.filter((item) => item.status !== 'duplicate');
  if (!addable.length) return [];
  const options = commonOptions(form);
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
