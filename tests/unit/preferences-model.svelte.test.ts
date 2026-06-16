import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import { PreferencesModel } from '../../src/features/preferences/preferences-model.svelte';
import { PREFERENCES, type PrefDef } from '../../src/features/preferences/schema';
import { fromUi, toUi } from '../../src/features/preferences/values';
import type { ToastInput } from '../../src/ui/adw/toast.svelte';
import fixture from '../fixtures/preferences-5.2.json';

const def = (key: string) => PREFERENCES.find((d) => d.key === key) as PrefDef;
const server = () => structuredClone(fixture) as Record<string, unknown>;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(confirm = vi.fn(async () => true)) {
  const api = { preferences: vi.fn(async () => server()), setPreferences: vi.fn(async (_c: Record<string, unknown>) => {}) };
  const toasts: ToastInput[] = [];
  const model = new PreferencesModel({ api, toast: { show: (t) => toasts.push(t) }, confirm });
  return { api, toasts, model, confirm };
}

describe('preference values', () => {
  it('shows limits in KiB/s and never rewrites a limit that is not a whole KiB unless it changed', () => {
    const prefs = { ...server(), dl_limit: 1500 };
    expect(toUi(def('dl_limit'), prefs)).toBe(1);
    expect(fromUi(def('dl_limit'), 2048, prefs)).toEqual({ dl_limit: 2_097_152 });
  });

  it('treats −1 as off for connection limits, and pairs ratio limits with their switch', () => {
    expect(toUi(def('max_connec'), { max_connec: -1 })).toEqual({ on: false, value: 500 });
    expect(fromUi(def('max_connec'), { on: false, value: 500 }, { max_connec: 200 })).toEqual({ max_connec: -1 });
    expect(fromUi(def('max_connec'), { on: true, value: 300 }, { max_connec: -1 })).toEqual({ max_connec: 300 });
    expect(toUi(def('max_ratio'), { max_ratio: -1, max_ratio_enabled: false })).toEqual({ on: false, value: 1 });
    expect(fromUi(def('max_ratio'), { on: true, value: 2.5 }, { max_ratio_enabled: false })).toEqual({ max_ratio_enabled: true, max_ratio: 2.5 });
    expect(fromUi(def('max_ratio'), { on: false, value: 2.5 }, { max_ratio_enabled: true })).toEqual({ max_ratio_enabled: false });
  });

  it('keeps −1 “automatic” disk cache, joins lists with their separator, and pairs schedule times', () => {
    expect(toUi(def('disk_cache'), { disk_cache: -1 })).toBe(-1);
    expect(toUi(def('web_ui_domain_list'), { web_ui_domain_list: 'a.example; b.example;' })).toEqual(['a.example', 'b.example']);
    expect(fromUi(def('web_ui_domain_list'), ['a.example', 'c.example'], {})).toEqual({ web_ui_domain_list: 'a.example;c.example' });
    expect(fromUi(def('banned_IPs'), ['1.2.3.4', '5.6.7.8'], {})).toEqual({ banned_IPs: '1.2.3.4\n5.6.7.8' });
    expect(toUi(def('schedule_from_hour'), { schedule_from_hour: 8, schedule_from_min: 5 })).toBe('08:05');
    expect(fromUi(def('schedule_from_hour'), '22:30', {})).toEqual({ schedule_from_hour: 22, schedule_from_min: 30 });
  });
});

describe('PreferencesModel', () => {
  it('loads the server values and applies a switch at once, sending only its key', async () => {
    const { api, model } = setup();
    await model.load();
    expect(model.ui(def('dht'))).toBe(true);
    model.edit(def('dht'), false);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.setPreferences).toHaveBeenCalledWith({ dht: false });
    expect(model.ui(def('dht'))).toBe(false);
  });

  it('sends fast typing once, 600 ms after the last change, and flushes on close', async () => {
    const { api, model } = setup();
    await model.load();
    model.edit(def('dl_limit'), 1, { debounce: true });
    model.edit(def('dl_limit'), 10, { debounce: true });
    model.edit(def('dl_limit'), 100, { debounce: true });
    expect(model.ui(def('dl_limit'))).toBe(100);
    await vi.advanceTimersByTimeAsync(599);
    expect(api.setPreferences).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.setPreferences).toHaveBeenCalledTimes(1);
    expect(api.setPreferences).toHaveBeenCalledWith({ dl_limit: 102_400 });
    model.edit(def('up_limit'), 5, { debounce: true });
    await model.flush();
    expect(api.setPreferences).toHaveBeenLastCalledWith({ up_limit: 5120 });
    expect(api.setPreferences).toHaveBeenCalledTimes(2);
  });

  it('sends nothing when a row ends up back at its server value', async () => {
    const { api, model } = setup();
    await model.load();
    model.edit(def('listen_port'), 12345, { debounce: true });
    model.edit(def('listen_port'), 32857, { debounce: true });
    await model.flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.setPreferences).not.toHaveBeenCalled();
  });

  it('rolls back only the failed key, explains, and never resurrects it on a later success', async () => {
    const { api, toasts, model } = setup();
    await model.load();
    api.setPreferences.mockRejectedValueOnce(new ApiError('request', 400, 'Invalid port'));
    model.edit(def('listen_port'), 70000);
    await vi.advanceTimersByTimeAsync(0);
    expect(model.ui(def('listen_port'))).toBe(32857);
    expect(toasts.at(-1)!.title).toBe('Couldn’t change “Port for incoming connections”: Invalid port');
    model.edit(def('upnp'), false);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.setPreferences).toHaveBeenLastCalledWith({ upnp: false });
    expect(model.ui(def('listen_port'))).toBe(32857);
  });

  it('asks before a dangerous change, and a cancel changes nothing', async () => {
    const confirm = vi.fn(async () => false);
    const { api, model } = setup(confirm);
    await model.load();
    model.edit(def('web_ui_port'), 8080, { debounce: true });
    await model.flush();
    expect(confirm).toHaveBeenCalledWith(def('web_ui_port'), 9000, 8080);
    expect(api.setPreferences).not.toHaveBeenCalled();
    expect(model.ui(def('web_ui_port'))).toBe(9000);
    confirm.mockResolvedValueOnce(true);
    model.edit(def('web_ui_port'), 8080);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.setPreferences).toHaveBeenCalledWith({ web_ui_port: 8080 });
  });

  it('only asks when turning localhost bypass off', async () => {
    const { confirm, model } = setup();
    await model.load();
    model.edit(def('bypass_local_auth'), true);
    await vi.advanceTimersByTimeAsync(0);
    expect(confirm).not.toHaveBeenCalled();
    model.edit(def('bypass_local_auth'), false);
    await vi.advanceTimersByTimeAsync(0);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('never keeps or shows the write-only password after sending it', async () => {
    const { api, model } = setup();
    await model.load();
    model.edit(def('web_ui_password'), 'correct horse', { debounce: true });
    expect(model.ui(def('web_ui_password'))).toBe('correct horse');
    await model.flush();
    expect(api.setPreferences).toHaveBeenCalledWith({ web_ui_password: 'correct horse' });
    expect(model.ui(def('web_ui_password'))).toBe('');
  });

  it('evaluates visibility and enablement against the values being edited', async () => {
    const { model } = setup();
    await model.load();
    expect(model.visible(def('temp_path'))).toBe(false);
    model.edit(def('temp_path_enabled'), true);
    expect(model.visible(def('temp_path'))).toBe(true);
  });

  it('reports each change the server accepted, and only those', async () => {
    const onapplied = vi.fn();
    const api = { preferences: vi.fn(async () => server()), setPreferences: vi.fn(async (_c: Record<string, unknown>) => {}) };
    const model = new PreferencesModel({ api, toast: { show: vi.fn() }, confirm: vi.fn(async () => true), onapplied });
    await model.load();
    api.setPreferences.mockRejectedValueOnce(new Error('nope'));
    model.edit(def('upnp'), false);
    await vi.advanceTimersByTimeAsync(0);
    expect(onapplied).not.toHaveBeenCalled();
    model.edit(def('web_ui_port'), 8080);
    await vi.advanceTimersByTimeAsync(0);
    expect(onapplied).toHaveBeenCalledWith(def('web_ui_port'), { web_ui_port: 8080 });
  });
});

describe('PreferencesModel safety', () => {
  it('sends a quick undo made while the first change is still on its way', async () => {
    const { api, model } = setup();
    await model.load();
    let release!: () => void;
    api.setPreferences.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
    model.edit(def('dht'), false);
    model.edit(def('dht'), true);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.setPreferences.mock.calls.map(([changes]) => changes)).toEqual([{ dht: false }, { dht: true }]);
    expect(model.ui(def('dht'))).toBe(true);
  });

  it('holds commit-only rows (paths, dangerous rows) until they are committed', async () => {
    const { api, model } = setup();
    await model.load();
    model.edit(def('file_log_path'), '/var/lo', { commit: true });
    model.edit(def('file_log_path'), '/var/log/qbt', { commit: true });
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.setPreferences).not.toHaveBeenCalled();
    await model.flush();
    expect(api.setPreferences).toHaveBeenCalledTimes(1);
    expect(api.setPreferences).toHaveBeenCalledWith({ file_log_path: '/var/log/qbt' });
  });

  it('validates credentials like qBittorrent, showing why and sending nothing', async () => {
    const { api, confirm, model } = setup();
    await model.load();
    model.edit(def('web_ui_username'), 'ab', { commit: true });
    expect(model.errors.web_ui_username).toBe('At least 3 characters');
    model.edit(def('web_ui_username'), 'a:b:c', { commit: true });
    expect(model.errors.web_ui_username).toBe('Can’t contain “:”');
    model.edit(def('web_ui_password'), 'short', { commit: true });
    expect(model.errors.web_ui_password).toBe('At least 6 characters');
    await model.flush();
    expect(confirm).not.toHaveBeenCalled();
    expect(api.setPreferences).not.toHaveBeenCalled();
    model.edit(def('web_ui_username'), 'admin2', { commit: true });
    expect(model.errors.web_ui_username).toBeUndefined();
  });

  it('never sends an empty password', async () => {
    const { api, confirm, model } = setup();
    await model.load();
    model.edit(def('web_ui_password'), 'typed', { commit: true });
    model.edit(def('web_ui_password'), '', { commit: true });
    await model.flush();
    expect(model.errors.web_ui_password).toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
    expect(api.setPreferences).not.toHaveBeenCalled();
  });

  it('refuses HTTPS without a certificate and key, explaining in a toast', async () => {
    const { api, toasts, model } = setup();
    await model.load();
    model.edit(def('use_https'), true);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.setPreferences).not.toHaveBeenCalled();
    expect(model.ui(def('use_https'))).toBe(false);
    expect(toasts.at(-1)!.title).toBe('Can’t turn on “Use HTTPS”: Set the certificate and key first');
  });

  it('asks before changing the certificate while HTTPS is on, but not while it is off', async () => {
    const { confirm, model } = setup();
    await model.load();
    model.edit(def('web_ui_https_cert_path'), '/etc/cert.pem', { commit: true });
    await model.flush();
    expect(confirm).not.toHaveBeenCalled();
    const second = setup();
    second.api.preferences.mockResolvedValue({ ...server(), use_https: true, web_ui_https_cert_path: '/a.pem', web_ui_https_key_path: '/a.key' });
    await second.model.load();
    second.model.edit(def('web_ui_https_cert_path'), '/b.pem', { commit: true });
    await second.model.flush();
    expect(second.confirm).toHaveBeenCalledTimes(1);
  });
});
