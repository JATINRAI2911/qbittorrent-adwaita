import type { ServerState } from '../../api/types';
import { formatBytes, formatCount } from '../../lib/format';

export interface StatisticsSection {
  title: string;
  rows: { label: string; value: string }[];
}

const DASH = '–';
const bytes = (value: number | undefined) => (typeof value === 'number' ? formatBytes(value) : DASH);
const count = (value: number | undefined) => (typeof value === 'number' ? formatCount(value) : DASH);
const percent = (value: string | undefined) => (value !== undefined && value !== '' ? `${value}%` : DASH);

/** The rows of qBittorrent's own Statistics dialog, from server_state. */
export function statisticsSections(s: Partial<ServerState>): StatisticsSection[] {
  return [
    {
      title: 'All Time',
      rows: [
        { label: 'Downloaded', value: bytes(s.alltime_dl) },
        { label: 'Uploaded', value: bytes(s.alltime_ul) },
        { label: 'Share ratio', value: s.global_ratio ?? DASH },
      ],
    },
    {
      title: 'This Session',
      rows: [
        { label: 'Downloaded', value: bytes(s.dl_info_data) },
        { label: 'Uploaded', value: bytes(s.up_info_data) },
        { label: 'Wasted', value: bytes(s.total_wasted_session) },
        { label: 'Connected peers', value: count(s.total_peer_connections) },
      ],
    },
    {
      title: 'Cache',
      rows: [
        { label: 'Read cache hits', value: percent(s.read_cache_hits) },
        { label: 'Total buffer size', value: bytes(s.total_buffers_size) },
      ],
    },
    {
      title: 'Performance',
      rows: [
        { label: 'Write cache overload', value: percent(s.write_cache_overload) },
        { label: 'Read cache overload', value: percent(s.read_cache_overload) },
        { label: 'Queued I/O jobs', value: count(s.queued_io_jobs) },
        { label: 'Average time in queue', value: typeof s.average_time_queue === 'number' ? `${formatCount(s.average_time_queue)} ms` : DASH },
        { label: 'Total queued size', value: bytes(s.total_queued_size) },
      ],
    },
  ];
}
