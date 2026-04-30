import { describe, expect, it } from 'vitest';
import { statisticsSections } from '../../src/features/global/statistics';

describe('statisticsSections', () => {
  it('formats all-time, session, cache and performance figures like qBittorrent’s own dialog', () => {
    const sections = statisticsSections({
      alltime_dl: 2048, alltime_ul: 1024, global_ratio: '0.14',
      dl_info_data: 0, up_info_data: 1024, total_wasted_session: 0, total_peer_connections: 3,
      read_cache_hits: '16.07', total_buffers_size: 1024,
      write_cache_overload: '0', read_cache_overload: '0', queued_io_jobs: 2, average_time_queue: 1311, total_queued_size: 0,
    });
    expect(sections.map((s) => [s.title, s.rows.map((r) => `${r.label}: ${r.value}`)])).toEqual([
      ['All Time', ['Downloaded: 2.0 kB', 'Uploaded: 1.0 kB', 'Share ratio: 0.14']],
      ['This Session', ['Downloaded: 0 bytes', 'Uploaded: 1.0 kB', 'Wasted: 0 bytes', 'Connected peers: 3']],
      ['Cache', ['Read cache hits: 16.07%', 'Total buffer size: 1.0 kB']],
      ['Performance', ['Write cache overload: 0%', 'Read cache overload: 0%', 'Queued I/O jobs: 2', 'Average time in queue: 1,311 ms', 'Total queued size: 0 bytes']],
    ]);
  });

  it('shows a dash for figures qBittorrent has not sent', () => {
    const rows = statisticsSections({}).flatMap((s) => s.rows.map((r) => r.value));
    expect(new Set(rows)).toEqual(new Set(['–']));
  });
});
