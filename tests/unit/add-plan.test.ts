import { describe, expect, it } from 'vitest';
import type { AddForm, AddItem } from '../../src/features/add/add-model.svelte';
import { buildAddPlan } from '../../src/features/add/plan';
import { metadata } from '../fixtures/fake-add-api';

const form = (overrides: Partial<AddForm> = {}): AddForm => ({
  category: '', autoTMM: false, savePath: '/dl', useDownloadPath: false, downloadPath: '', tags: [], start: true, contentLayout: 'Original',
  stopCondition: 'None', skipChecking: false, sequential: false, firstLast: false, addToTop: false, rename: '', dlLimitKiB: 0, upLimitKiB: 0, ...overrides,
});
const item = (overrides: Partial<AddItem>): AddItem => ({ id: 1, kind: 'magnet', label: 'x', source: 'magnet:?xt=urn:btih:aa', hash: 'aa', status: 'ready', metadata: null, error: null, ...overrides });
const threeFiles = metadata({ hash: 'hh', files: [{ path: 'd/a', length: 1 }, { path: 'd/b', length: 1 }, { path: 'd/c', length: 1 }] });

describe('buildAddPlan', () => {
  it('sends links in one request and files in another, with the common options', () => {
    const file = new File(['1'], 'a.torrent');
    const plan = buildAddPlan(
      [item({ id: 1 }), item({ id: 2, kind: 'url', source: 'https://x/y.torrent', hash: null }), item({ id: 3, kind: 'file', source: file, hash: 'ff' })],
      form({ category: 'ISOs', tags: ['keep'], start: false, dlLimitKiB: 2, sequential: true }),
      new Set(),
    );
    expect(plan).toEqual([
      { sources: { urls: ['magnet:?xt=urn:btih:aa', 'https://x/y.torrent'] }, options: expect.objectContaining({ category: 'ISOs', tags: ['keep'], stopped: true, dlLimit: 2048, sequentialDownload: true, savepath: '/dl', autoTMM: false }) },
      { sources: { files: [file] }, options: expect.objectContaining({ category: 'ISOs', stopped: true }) },
    ]);
  });

  it('leaves out duplicates, and the save path under automatic management', () => {
    const plan = buildAddPlan([item({ status: 'duplicate' }), item({ id: 2, source: 'magnet:?xt=urn:btih:bb', hash: 'bb' })], form({ autoTMM: true }), new Set());
    expect(plan).toHaveLength(1);
    expect(plan[0]!.sources.urls).toEqual(['magnet:?xt=urn:btih:bb']);
    expect(plan[0]!.options).toMatchObject({ autoTMM: true });
    expect(plan[0]!.options.savepath).toBeUndefined();
  });

  it('sends a file selection as filePriorities for a single link', () => {
    const plan = buildAddPlan([item({ metadata: threeFiles })], form({ rename: 'Nicer name' }), new Set([1]));
    expect(plan).toEqual([{ sources: { urls: ['magnet:?xt=urn:btih:aa'] }, options: expect.objectContaining({ filePriorities: [1, 0, 1], rename: 'Nicer name' }) }]);
  });

  it('adds a single .torrent file stopped, then skips files and starts it, since the API refuses filePriorities for uploads', () => {
    const file = new File(['1'], 'a.torrent');
    const plan = buildAddPlan([item({ kind: 'file', source: file, hash: 'hh', metadata: threeFiles })], form({ start: true }), new Set([0, 2]));
    expect(plan).toEqual([{ sources: { files: [file] }, options: expect.objectContaining({ stopped: true }), after: { hash: 'hh', skip: [0, 2], start: true } }]);
    expect(plan[0]!.options.filePriorities).toBeUndefined();
  });

  it('ignores a file selection and a rename when several torrents are added', () => {
    const plan = buildAddPlan([item({ metadata: threeFiles }), item({ id: 2, source: 'magnet:?xt=urn:btih:bb', hash: 'bb' })], form({ rename: 'x' }), new Set([1]));
    expect(plan[0]!.options.filePriorities).toBeUndefined();
    expect(plan[0]!.options.rename).toBeUndefined();
  });

  it('sends the incomplete folder only when it is used', () => {
    const [request] = buildAddPlan([item({})], form({ useDownloadPath: true, downloadPath: '/dl/tmp' }), new Set());
    expect(request!.options).toMatchObject({ useDownloadPath: true, downloadPath: '/dl/tmp' });
    const [plain] = buildAddPlan([item({})], form({ useDownloadPath: false, downloadPath: '/dl/tmp' }), new Set());
    expect(plain!.options.downloadPath).toBeUndefined();
  });
});
