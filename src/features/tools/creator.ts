import type { CreatorTaskParams } from '../../api/creator';

export interface CreatorForm {
  sourcePath: string;
  /** Bytes; 0 lets qBittorrent choose. */
  pieceSize: number;
  /** libtorrent 2 only. */
  format: 'v1' | 'v2' | 'hybrid';
  /** libtorrent 1 only. */
  optimizeAlignment: boolean;
  padFiles: boolean;
  paddedFileSizeLimitKiB: number;
  private: boolean;
  startSeeding: boolean;
  trackers: string;
  urlSeeds: string;
  comment: string;
  source: string;
}

export const defaultCreatorForm = (): CreatorForm => ({
  sourcePath: '',
  pieceSize: 0,
  format: 'hybrid',
  optimizeAlignment: true,
  padFiles: false,
  paddedFileSizeLimitKiB: 0,
  private: false,
  startSeeding: true,
  trackers: '',
  urlSeeds: '',
  comment: '',
  source: '',
});

/** Automatic, then 16 KiB … 128 MiB, as qBittorrent offers. */
export const PIECE_SIZES = [0, ...Array.from({ length: 14 }, (_, i) => 1024 << (i + 4))];

export function pieceSizeLabel(bytes: number): string {
  if (!bytes) return 'Automatic';
  return bytes >= 1024 * 1024 ? `${bytes / (1024 * 1024)} MiB` : `${bytes / 1024} KiB`;
}

/** Format choice exists from libtorrent 2; alignment options only before it. An unknown version counts as 2. */
export const isLibtorrent2 = (version: string) => !/^\d/.test(version) || Number.parseInt(version, 10) >= 2;

/**
 * qBittorrent's encoding for trackers and web seeds: one URL per line, each URI-encoded, joined with
 * `|`. Blank lines inside the list start a new tracker tier and are kept; blank ends are dropped.
 */
export function encodeUrlLines(text: string): string {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines.at(-1)) lines.pop();
  return lines.map((line) => encodeURIComponent(line)).join('|');
}

export function taskParams(form: CreatorForm, libtorrent2: boolean): CreatorTaskParams {
  const params: CreatorTaskParams = {
    sourcePath: form.sourcePath.trim(),
    pieceSize: form.pieceSize,
    private: form.private,
    startSeeding: form.startSeeding,
  };
  if (libtorrent2) params.format = form.format;
  else {
    params.optimizeAlignment = form.optimizeAlignment;
    params.paddedFileSizeLimit = form.optimizeAlignment && form.padFiles ? Math.max(0, Math.round(form.paddedFileSizeLimitKiB)) : -1;
  }
  const trackers = encodeUrlLines(form.trackers);
  const urlSeeds = encodeUrlLines(form.urlSeeds);
  if (trackers) params.trackers = trackers;
  if (urlSeeds) params.urlSeeds = urlSeeds;
  if (form.comment.trim()) params.comment = form.comment.trim();
  if (form.source.trim()) params.source = form.source.trim();
  return params;
}

export function torrentFileName(sourcePath: string): string {
  const name = sourcePath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || 'torrent';
  return `${name}.torrent`;
}
