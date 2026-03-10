import type { Peer, PeersResponse } from '../api/details';

export const DEFAULT_PEER: Peer = {
  client: '',
  progress: 0,
  dl_speed: 0,
  up_speed: 0,
  downloaded: 0,
  uploaded: 0,
  connection: '',
  flags: '',
  flags_desc: '',
  relevance: 0,
};

/** Merge a `sync/torrentPeers` response into `state` in place, keeping peer object identity. */
export function applyPeers(state: Map<string, Peer>, response: PeersResponse, create: (peer: Peer) => Peer = (peer) => peer): void {
  if (response.full_update) state.clear();
  for (const id of response.peers_removed ?? []) state.delete(id);
  for (const [id, patch] of Object.entries(response.peers ?? {})) {
    const current = state.get(id);
    if (current) Object.assign(current, patch);
    else state.set(id, create({ ...DEFAULT_PEER, ...patch }));
  }
}

/** 'de' → 🇩🇪 (regional indicator symbols); anything that isn't two letters → ''. */
export function countryFlag(code?: string): string {
  if (!code || !/^[a-z]{2}$/i.test(code)) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
