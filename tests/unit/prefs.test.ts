import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS, PREFS_KEY, UiPrefs, sanitizePrefs } from '../../src/state/prefs.svelte';
import { fakeClientData } from '../fixtures/fake-clientdata';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('sanitizePrefs', () => {
  it('falls back field by field and always keeps the Name column first', () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ view: 'grid', listSort: 'ratio', tableSort: { column: 'bogus', descending: true }, columns: ['size', 'nope', 'size'] })).toEqual({
      view: 'list',
      listSort: 'ratio',
      tableSort: DEFAULT_PREFS.tableSort,
      columns: ['name', 'size'],
      sheetHeight: 0.5,
    });
    expect(sanitizePrefs({ view: 'table', columns: 'size' }).columns).toEqual(DEFAULT_PREFS.columns);
  });
});

describe('sanitizePrefs sheet height', () => {
  it('clamps the sheet height and falls back to one half', () => {
    expect(sanitizePrefs({ sheetHeight: 0.7 }).sheetHeight).toBe(0.7);
    expect(sanitizePrefs({ sheetHeight: 5 }).sheetHeight).toBe(0.92);
    expect(sanitizePrefs({ sheetHeight: 0.01 }).sheetHeight).toBe(0.22);
    expect(sanitizePrefs({ sheetHeight: 'tall' }).sheetHeight).toBe(0.5);
  });
});

describe('UiPrefs', () => {
  it('starts from the local copy, then takes the server copy on load', async () => {
    const storage = memoryStorage({ 'adw-ui.prefs': JSON.stringify({ view: 'table' }) });
    const api = fakeClientData({ [PREFS_KEY]: { view: 'list', listSort: 'name' } });
    const prefs = new UiPrefs({ api, storage });
    expect(prefs.view).toBe('table');
    await prefs.load();
    expect(api.load).toHaveBeenCalledWith([PREFS_KEY]);
    expect([prefs.view, prefs.listSort]).toEqual(['list', 'name']);
    expect(JSON.parse(storage.data.get('adw-ui.prefs')!)).toMatchObject({ view: 'list', listSort: 'name' });
  });

  it('keeps the local copy when the server has nothing or fails', async () => {
    const storage = memoryStorage({ 'adw-ui.prefs': JSON.stringify({ listSort: 'size' }) });
    const failing = fakeClientData();
    failing.load.mockRejectedValueOnce(new Error('down'));
    const prefs = new UiPrefs({ api: failing, storage });
    await prefs.load();
    expect(prefs.listSort).toBe('size');
    const empty = new UiPrefs({ api: fakeClientData(), storage });
    await empty.load();
    expect(empty.listSort).toBe('size');
  });

  it('does not let a slow server load overwrite a change made meanwhile', async () => {
    let resolve!: (value: Record<string, unknown>) => void;
    const api = fakeClientData();
    api.load.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const prefs = new UiPrefs({ api });
    const loading = prefs.load();
    prefs.setView('table');
    resolve({ [PREFS_KEY]: { view: 'list' } });
    await loading;
    expect(prefs.view).toBe('table');
  });

  it('merges a slow server load field by field: only what was changed meanwhile stays local', async () => {
    let resolve!: (value: Record<string, unknown>) => void;
    const api = fakeClientData();
    api.load.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const prefs = new UiPrefs({ api });
    const loading = prefs.load();
    prefs.setView('table');
    resolve({ [PREFS_KEY]: { view: 'list', listSort: 'ratio', columns: ['name', 'size'], sheetHeight: 0.7, futureKey: 1 } });
    await loading;
    expect([prefs.view, prefs.listSort, prefs.columns, prefs.sheetHeight]).toEqual(['table', 'ratio', ['name', 'size'], 0.7]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.store).toHaveBeenLastCalledWith({ [PREFS_KEY]: expect.objectContaining({ view: 'table', listSort: 'ratio', sheetHeight: 0.7, futureKey: 1 }) });
  });

  it('ignores a stored value that isn’t an object instead of resetting everything', async () => {
    const storage = memoryStorage({ 'adw-ui.prefs': JSON.stringify({ view: 'table', listSort: 'ratio' }) });
    const prefs = new UiPrefs({ api: fakeClientData({ [PREFS_KEY]: null }), storage });
    await prefs.load();
    expect([prefs.view, prefs.listSort]).toEqual(['table', 'ratio']);
  });

  it('writes local storage at once and the server after a 1 s pause', async () => {
    const storage = memoryStorage();
    const api = fakeClientData();
    const prefs = new UiPrefs({ api, storage });
    prefs.setListSort('ratio');
    prefs.setTableSort({ column: 'size', descending: false });
    expect(JSON.parse(storage.data.get('adw-ui.prefs')!)).toMatchObject({ listSort: 'ratio' });
    await vi.advanceTimersByTimeAsync(999);
    expect(api.store).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.store).toHaveBeenCalledTimes(1);
    expect(api.store).toHaveBeenCalledWith({ [PREFS_KEY]: expect.objectContaining({ listSort: 'ratio', tableSort: { column: 'size', descending: false } }) });
  });

  it('toggles columns in canonical order and never hides Name', () => {
    const prefs = new UiPrefs({ api: fakeClientData() });
    prefs.setColumns(['name', 'size']);
    prefs.toggleColumn('status');
    expect(prefs.columns).toEqual(['name', 'status', 'size']);
    prefs.toggleColumn('size');
    prefs.toggleColumn('name');
    expect(prefs.columns).toEqual(['name', 'status']);
  });

  it('swallows server write failures', async () => {
    const api = fakeClientData();
    api.store.mockRejectedValueOnce(new Error('down'));
    const prefs = new UiPrefs({ api });
    prefs.setView('table');
    await expect(prefs.flush()).resolves.toBeUndefined();
  });

  it('keeps an unsynced local change across a reload and re-sends it', async () => {
    const storage = memoryStorage();
    new UiPrefs({ api: fakeClientData(), storage }).setView('table'); // reload before the 1 s write
    const api = fakeClientData({ [PREFS_KEY]: { view: 'list' } });
    const reloaded = new UiPrefs({ api, storage });
    await reloaded.load();
    expect(reloaded.view).toBe('table');
    expect(api.store).toHaveBeenCalledWith({ [PREFS_KEY]: expect.objectContaining({ view: 'table' }) });
  });

  it('keeps the local change when the server write failed', async () => {
    const storage = memoryStorage();
    const failing = fakeClientData();
    failing.store.mockRejectedValue(new Error('down'));
    new UiPrefs({ api: failing, storage }).setView('table');
    await vi.advanceTimersByTimeAsync(1000);
    const reloaded = new UiPrefs({ api: fakeClientData({ [PREFS_KEY]: { view: 'list' } }), storage });
    await reloaded.load();
    expect(reloaded.view).toBe('table');
  });

  it('takes the server copy once the local copy was synced', async () => {
    const storage = memoryStorage();
    new UiPrefs({ api: fakeClientData(), storage }).setView('table');
    await vi.advanceTimersByTimeAsync(1000);
    const reloaded = new UiPrefs({ api: fakeClientData({ [PREFS_KEY]: { view: 'list' } }), storage });
    await reloaded.load();
    expect(reloaded.view).toBe('list');
  });

  it('flushes right away when asked while a change is pending, and not otherwise', async () => {
    const api = fakeClientData();
    const prefs = new UiPrefs({ api, storage: memoryStorage() });
    await prefs.flushIfPending();
    expect(api.store).not.toHaveBeenCalled();
    prefs.setView('table');
    await prefs.flushIfPending();
    expect(api.store).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.store).toHaveBeenCalledTimes(1);
  });

  it('sets the sheet height within its limits and saves it', async () => {
    const api = fakeClientData();
    const prefs = new UiPrefs({ api });
    prefs.setSheetHeight(0.99);
    expect(prefs.sheetHeight).toBe(0.92);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.store).toHaveBeenCalledWith({ [PREFS_KEY]: expect.objectContaining({ sheetHeight: 0.92 }) });
  });

  it('keeps keys it does not know when writing back', async () => {
    const api = fakeClientData({ [PREFS_KEY]: { view: 'list', futureKey: { a: 1 } } });
    const prefs = new UiPrefs({ api, storage: memoryStorage() });
    await prefs.load();
    prefs.setView('table');
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.store).toHaveBeenLastCalledWith({ [PREFS_KEY]: expect.objectContaining({ view: 'table', futureKey: { a: 1 } }) });
  });
});
