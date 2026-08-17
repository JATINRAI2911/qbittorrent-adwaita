import { describe, expect, it } from 'vitest';
import type { TorrentState } from '../../src/api/types';
import { bubbleKind, describeRow, etaText, isInactive, parseTags, progressTone, showProgress } from '../../src/features/list/describe';
import { makeTorrent } from '../fixtures/torrents';

const text = (segments: { text: string }[]) => segments.map((s) => s.text).join(' - ');

describe('describeRow', () => {
  it('downloading shows amount, percent and live speeds', () => {
    const t = makeTorrent({ state: 'downloading', size: 5_900_000_000, completed: 4_800_000_000, progress: 0.8136, dlspeed: 8_200_000, upspeed: 310_000 });
    expect(text(describeRow(t))).toBe('4.8 GB of 5.9 GB (81.3%) - ↓ 8.2 MB/s  ↑ 310.0 kB/s');
  });

  it('downloading with no traffic says it is connecting', () => {
    expect(text(describeRow(makeTorrent({ state: 'downloading', size: 1000, completed: 0 })))).toBe('0 bytes of 1.0 kB (0%) - Connecting to peers…');
  });

  it('stalled downloads get a warning-toned segment', () => {
    const segments = describeRow(makeTorrent({ state: 'stalledDL', size: 1000, completed: 500, progress: 0.5 }));
    expect(segments[1]).toEqual({ text: 'Stalled · waiting for peers', tone: 'warning' });
  });

  it('errors and missing files are error-toned', () => {
    expect(describeRow(makeTorrent({ state: 'error' }))[0]!.tone).toBe('error');
    expect(describeRow(makeTorrent({ state: 'missingFiles', save_path: '/Volumes/Media' }))).toEqual([
      { text: 'Files are missing from /Volumes/Media', tone: 'error' },
    ]);
  });

  it('seeding shows size and ratio; idle seeding says Idle', () => {
    expect(text(describeRow(makeTorrent({ state: 'stalledUP', size: 2_000_000_000, ratio: 2.144, progress: 1 })))).toBe('2.0 GB · Ratio 2.14 - Idle');
    expect(text(describeRow(makeTorrent({ state: 'uploading', size: 2_000_000_000, ratio: 1, upspeed: 1_000_000, progress: 1 })))).toBe('2.0 GB · Ratio 1.00 - ↑ 1.0 MB/s');
  });

  it('never leaks NaN, Infinity or undefined for metadata-less or sentinel values', () => {
    const states: TorrentState[] = ['downloading', 'metaDL', 'stalledDL', 'queuedDL', 'stoppedDL', 'stoppedUP', 'uploading', 'unknown', 'moving', 'checkingResumeData'];
    for (const state of states) {
      const t = makeTorrent({ state, size: 0, completed: 0, progress: Number.NaN, ratio: 9999, eta: 8_640_000, dlspeed: 0 });
      const out = text(describeRow(t)) + etaText(t);
      expect(out, state).not.toMatch(/NaN|Infinity|undefined/);
    }
    expect(text(describeRow(makeTorrent({ state: 'stoppedDL', size: 0 })))).toBe('Stopped · Size unknown');
  });
});

describe('etaText', () => {
  it('shows an ETA only while actually downloading', () => {
    expect(etaText(makeTorrent({ state: 'downloading', dlspeed: 10, eta: 300 }))).toBe('5 minutes left');
    expect(etaText(makeTorrent({ state: 'downloading', dlspeed: 0, eta: 300 }))).toBe('');
    expect(etaText(makeTorrent({ state: 'stalledDL', dlspeed: 10, eta: 300 }))).toBe('');
  });
});

describe('row flags', () => {
  it.each<[TorrentState, string]>([
    ['downloading', 'downloading'], ['forcedDL', 'downloading'], ['uploading', 'seeding'], ['stalledDL', 'stalled'],
    ['stalledUP', 'idle'], ['stoppedDL', 'stopped'], ['queuedUP', 'queued'], ['metaDL', 'busy'], ['moving', 'busy'],
    ['checkingResumeData', 'busy'], ['error', 'error'], ['missingFiles', 'error'], ['unknown', 'stopped'],
  ])('bubble for %s is %s', (state, kind) => expect(bubbleKind(makeTorrent({ state }))).toBe(kind));

  it('treats only stopped and queued torrents as inactive (idle seeds are not)', () => {
    expect(isInactive(makeTorrent({ state: 'stoppedUP' }))).toBe(true);
    expect(isInactive(makeTorrent({ state: 'queuedDL' }))).toBe(true);
    expect(isInactive(makeTorrent({ state: 'stalledUP' }))).toBe(false);
  });

  it('hides the progress bar for finished torrents unless they are being checked', () => {
    expect(showProgress(makeTorrent({ progress: 1, state: 'stalledUP' }))).toBe(false);
    expect(showProgress(makeTorrent({ progress: 1, state: 'checkingUP' }))).toBe(true);
    expect(showProgress(makeTorrent({ progress: 0.5, state: 'downloading' }))).toBe(true);
    // Missing files at 0 %: an empty red track says nothing the error line doesn't.
    expect(showProgress(makeTorrent({ progress: 0, state: 'missingFiles' }))).toBe(false);
    expect(showProgress(makeTorrent({ progress: 0.4, state: 'missingFiles' }))).toBe(true);
  });

  it('picks the progress tone from the state', () => {
    expect(progressTone(makeTorrent({ state: 'error' }))).toBe('error');
    expect(progressTone(makeTorrent({ state: 'stalledDL' }))).toBe('warning');
    expect(progressTone(makeTorrent({ state: 'stoppedDL' }))).toBe('inactive');
    expect(progressTone(makeTorrent({ state: 'downloading' }))).toBe('accent');
  });

  it('parses the comma-separated tags field', () => {
    expect(parseTags('keep, private')).toEqual(['keep', 'private']);
    expect(parseTags('')).toEqual([]);
  });
});
