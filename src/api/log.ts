import { getJson } from './client';

/** qBittorrent's log levels (bit values of Log::MsgType). */
export const LOG_TYPE = { normal: 1, info: 2, warning: 4, critical: 8 } as const;

export interface LogMessage {
  id: number;
  message: string;
  /** Seconds since the epoch. */
  timestamp: number;
  type: number;
}

export interface PeerLogEntry {
  id: number;
  ip: string;
  /** True: blocked by the IP filter; false: banned. */
  blocked: boolean;
  reason: string;
  timestamp: number;
}

export const logApi = {
  /** Messages with an id above `lastKnownId` (−1 for all). */
  main: (lastKnownId: number) => getJson<LogMessage[]>('log/main', { last_known_id: lastKnownId }),
  peers: (lastKnownId: number) => getJson<PeerLogEntry[]>('log/peers', { last_known_id: lastKnownId }),
};

export type LogApi = typeof logApi;
