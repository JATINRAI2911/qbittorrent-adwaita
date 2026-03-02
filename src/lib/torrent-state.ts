import type { Torrent } from '../api/types';

export const isStopped = (t: Pick<Torrent, 'state'>) => t.state === 'stoppedDL' || t.state === 'stoppedUP';

/**
 * Torrents Start acts on. qBittorrent reports `missingFiles` / `error` ahead of "stopped"
 * (TorrentImpl::updateState), and Start is how you recover them.
 */
export const needsStart = (t: Pick<Torrent, 'state'>) => isStopped(t) || t.state === 'missingFiles' || t.state === 'error';

/** Torrents Stop acts on. */
export const isRunning = (t: Pick<Torrent, 'state'>) => !needsStart(t);
