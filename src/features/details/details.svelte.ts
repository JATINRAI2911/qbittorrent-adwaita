import { SvelteMap } from 'svelte/reactivity';
import type { DetailsApi, Peer, PieceState, TorrentFile, TorrentProperties, Tracker, WebSeed } from '../../api/details';
import { errorText } from '../../commands/mutate';
import { applyPeers } from '../../sync/peers';
import { Refresher } from '../../sync/refresher';

export type SheetState = 'closed' | 'open' | 'bar';
export type DetailTab = 'overview' | 'files' | 'trackers' | 'peers' | 'sources';

export const DETAIL_TABS: { value: DetailTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'files', label: 'Files' },
  { value: 'trackers', label: 'Trackers' },
  { value: 'peers', label: 'Peers' },
  { value: 'sources', label: 'HTTP Sources' },
];

export interface DetailsDeps {
  api: Pick<DetailsApi, 'properties' | 'pieceStates' | 'files' | 'trackers' | 'webseeds' | 'peers'>;
  isHidden(): boolean;
  onVisible(callback: () => void): () => void;
  /** Visible-tab poll interval; 2 s. */
  intervalMs?: number;
  /** Piece map refresh; 5 s. */
  piecesIntervalMs?: number;
  now?: () => number;
}

function reactivePeer(peer: Peer): Peer {
  const live = $state(peer);
  return live;
}

/** The details sheet: which torrent, which state, which tab - and the visible tab's polled data. */
/** How long keyboard focus must rest on a torrent before the sheet fetches it. */
const SHOW_SETTLE_MS = 250;

export class DetailsModel {
  hash = $state<string | null>(null);
  sheet = $state<SheetState>('closed');
  tab = $state<DetailTab>('overview');
  properties = $state.raw<TorrentProperties | null>(null);
  pieces = $state.raw<PieceState[] | null>(null);
  /** Deep state: priority changes are applied optimistically to these objects. */
  files = $state<TorrentFile[] | null>(null);
  trackers = $state.raw<Tracker[] | null>(null);
  webseeds = $state.raw<WebSeed[] | null>(null);
  readonly peers = new SvelteMap<string, Peer>();
  peersLoaded = $state(false);
  error = $state<string | null>(null);

  readonly #deps: DetailsDeps;
  readonly #refresher: Refresher;
  #peersRid = 0;
  /** Bumped when files change locally; a files response requested before that is stale. */
  #filesEpoch = 0;
  #piecesAt = Number.NEGATIVE_INFINITY;

  #suspended = false;
  #settling: ReturnType<typeof setTimeout> | undefined;

  constructor(deps: DetailsDeps) {
    this.#deps = deps;
    this.#refresher = new Refresher((isCurrent) => this.#load(isCurrent), {
      intervalMs: deps.intervalMs ?? 2000,
      isHidden: deps.isHidden,
      onVisible: deps.onVisible,
    });
  }

  open(hash: string): void {
    this.#settled();
    if (hash !== this.hash) this.#reset(hash);
    this.sheet = 'open';
    this.#sync();
  }

  /** Follow keyboard focus: switch torrents without changing the sheet's state. */
  show(hash: string): void {
    if (this.sheet === 'closed' || hash === this.hash) return;
    this.#reset(hash);
    // Arrowing through the list switches torrents quickly: fetch once the focus rests.
    this.#settled();
    this.#refresher.stop();
    this.#settling = setTimeout(() => {
      this.#settling = undefined;
      this.#sync();
    }, SHOW_SETTLE_MS);
  }

  /** While selection mode hides the sheet, nothing is polled; it resumes as it was afterwards. */
  setSuspended(suspended: boolean): void {
    if (suspended === this.#suspended) return;
    this.#suspended = suspended;
    this.#sync();
  }

  minimize(): void {
    if (this.sheet !== 'open') return;
    this.sheet = 'bar';
    this.#sync();
  }

  expand(): void {
    if (this.sheet !== 'bar') return;
    this.sheet = 'open';
    this.#sync();
  }

  close(): void {
    this.#settled();
    this.sheet = 'closed';
    this.hash = null;
    this.#sync();
  }

  setTab(tab: DetailTab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.error = null;
    this.#sync();
  }

  /** A local change to file priorities is in flight: ignore files responses requested before it. */
  markFilesChanged(): void {
    this.#filesEpoch++;
  }

  /** Fetch the visible tab again now (after an action changed it). */
  refresh(): void {
    this.#refresher.pokeNow();
  }

  dispose(): void {
    this.#settled();
    this.#refresher.stop();
  }

  #reset(hash: string): void {
    this.hash = hash;
    this.properties = null;
    this.pieces = null;
    this.files = null;
    this.trackers = null;
    this.webseeds = null;
    this.peers.clear();
    this.peersLoaded = false;
    this.error = null;
    this.#peersRid = 0;
    this.#piecesAt = Number.NEGATIVE_INFINITY;
  }

  #sync(): void {
    if (this.sheet === 'open' && this.hash !== null && !this.#suspended && this.#settling === undefined) this.#refresher.start();
    else this.#refresher.stop();
  }

  #settled(): void {
    clearTimeout(this.#settling);
    this.#settling = undefined;
  }

  async #load(isCurrent: () => boolean): Promise<void> {
    const hash = this.hash;
    if (hash === null) return;
    const { api } = this.#deps;
    try {
      switch (this.tab) {
        case 'overview': {
          const properties = await api.properties(hash);
          if (!isCurrent()) return;
          this.properties = properties;
          const now = this.#deps.now?.() ?? Date.now();
          if (now - this.#piecesAt >= (this.#deps.piecesIntervalMs ?? 5000)) {
            const pieces = await api.pieceStates(hash);
            if (!isCurrent()) return;
            this.pieces = pieces;
            this.#piecesAt = now;
          }
          break;
        }
        case 'files': {
          const epoch = this.#filesEpoch;
          const files = await api.files(hash);
          if (!isCurrent() || epoch !== this.#filesEpoch) return;
          this.files = files;
          break;
        }
        case 'trackers': {
          const trackers = await api.trackers(hash);
          if (!isCurrent()) return;
          this.trackers = trackers;
          break;
        }
        case 'peers': {
          const response = await api.peers(hash, this.#peersRid);
          if (!isCurrent()) return;
          applyPeers(this.peers, response, reactivePeer);
          this.#peersRid = response.rid;
          this.peersLoaded = true;
          break;
        }
        case 'sources': {
          const webseeds = await api.webseeds(hash);
          if (!isCurrent()) return;
          this.webseeds = webseeds;
          break;
        }
      }
      this.error = null;
    } catch (error) {
      if (isCurrent()) this.error = errorText(error);
    }
  }
}
