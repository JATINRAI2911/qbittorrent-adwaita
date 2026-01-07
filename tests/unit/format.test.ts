import { describe, expect, it } from 'vitest';
import { ETA_INFINITY, formatBytes, formatCount, formatEta, formatPercent, formatRatio, formatSpeed } from '../../src/lib/format';

describe('formatBytes (GLib g_format_size style)', () => {
  it.each([
    [0, '0 bytes'],
    [1, '1 byte'],
    [999, '999 bytes'],
    [1000, '1.0 kB'],
    [1536, '1.5 kB'],
    [5_900_000_000, '5.9 GB'],
    [999_950, '1.0 MB'],
    [2.5e15, '2.5 PB'],
  ])('%d → %s', (input, expected) => expect(formatBytes(input)).toBe(expected));

  it('never leaks NaN or negative values', () => {
    expect(formatBytes(Number.NaN)).toBe('–');
    expect(formatBytes(-5)).toBe('–');
  });
});

describe('formatSpeed', () => {
  it('appends /s', () => expect(formatSpeed(8_200_000)).toBe('8.2 MB/s'));
});

describe('formatEta', () => {
  it.each([
    [0, ''],
    [ETA_INFINITY, ''],
    [Number.POSITIVE_INFINITY, ''],
    [30, 'less than a minute left'],
    [60, '1 minute left'],
    [300, '5 minutes left'],
    [3 * 3600 + 25 * 60, '3 h 25 min left'],
    [2 * 86400, '2 days left'],
    [86400, '1 day left'],
  ])('%d s → %j', (input, expected) => expect(formatEta(input)).toBe(expected));
});

describe('formatPercent', () => {
  it.each([
    [0, '0%'],
    [0.8219, '82.1%'],
    [0.9999, '99.9%'],
    [1, '100%'],
    [Number.NaN, '0%'],
  ])('%d → %s', (input, expected) => expect(formatPercent(input)).toBe(expected));
});

describe('formatRatio', () => {
  it.each([
    [0.05, '0.05'],
    [2.144, '2.14'],
    [9999, '∞'],
    [-1, '–'],
    [Number.NaN, '–'],
  ])('%d → %s', (input, expected) => expect(formatRatio(input)).toBe(expected));
});

describe('formatCount', () => {
  it('formats small counts plainly', () => expect(formatCount(42)).toBe('42'));
});
